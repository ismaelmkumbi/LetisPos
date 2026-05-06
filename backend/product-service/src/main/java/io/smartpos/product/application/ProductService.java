package io.smartpos.product.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.smartpos.product.api.dto.BarcodeDto;
import io.smartpos.product.api.dto.BulkCreateProductsRequest;
import io.smartpos.product.api.dto.BulkCreateProductsResponse;
import io.smartpos.product.api.dto.CreateProductRequest;
import io.smartpos.product.api.dto.ProductDto;
import io.smartpos.product.api.dto.UpdateProductRequest;
import io.smartpos.product.domain.model.*;
import io.smartpos.common.context.TenantContext;
import io.smartpos.product.domain.repository.OutboxRepository;
import io.smartpos.product.domain.repository.ProductBarcodeRepository;
import io.smartpos.product.domain.repository.ProductRepository;
import io.smartpos.product.infrastructure.config.RedisCacheConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import io.smartpos.product.api.dto.ImportOpeningStockRequest;
import io.smartpos.product.api.dto.ImportOpeningStockResponse;
import io.smartpos.product.api.dto.ImportUpdateOnlyRequest;
import io.smartpos.product.api.dto.ImportUpdateOnlyResponse;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepo;
    private final ProductBarcodeRepository barcodeRepo;
    private final OutboxRepository outboxRepo;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public Page<ProductDto> search(String search, UUID categoryId, UUID brandId,
                                   Boolean status, Boolean featured, Pageable pageable) {
        return productRepo.search(search, categoryId, brandId, status, featured,
                TenantContext.require(), pageable).map(ProductDto::from);
    }

    /**
     * Hot path: fetch by id — cached by id.
     * Cache entries are evicted on update/delete.
     */
    @Transactional(readOnly = true)
    @Cacheable(value = RedisCacheConfig.CACHE_PRODUCT, key = "#id")
    public ProductDto get(UUID id) {
        return productRepo.findById(id).map(ProductDto::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
    }

    /**
     * Hot path: POS barcode scan. Two-lookup flow:
     *   barcode → productId (cached under CACHE_BARCODE)
     *   productId → ProductDto (cached under CACHE_PRODUCT via get(id))
     * This keeps the mapping invalidation granular when a barcode is re-assigned.
     */
    @Transactional(readOnly = true)
    @Cacheable(value = RedisCacheConfig.CACHE_BARCODE, key = "#barcode")
    public BarcodeLookup lookupByBarcode(String barcode) {
        ProductBarcode b = barcodeRepo.findByBarcode(barcode)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Barcode not found"));
        return new BarcodeLookup(b.getProductId(), b.getVariantId());
    }

    public record BarcodeLookup(UUID productId, UUID variantId) {}

    /**
     * Mint a fresh SKU like {@code PROD-000042}. Consumes a sequence value, so
     * each call returns a strictly higher number; gaps are expected when
     * users preview-and-cancel. Used both by the create flow (when the caller
     * omits {@code code}) and by the {@code GET /next-sku} endpoint.
     */
    @Transactional
    public String nextSku() {
        long n = productRepo.nextCodeSequence();
        return String.format("PROD-%06d", n);
    }

    @Transactional
    public ProductDto create(CreateProductRequest req) {
        String code = (req.code() == null || req.code().isBlank()) ? nextSku() : req.code();
        if (productRepo.existsByCodeIgnoreCase(code)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "SKU already exists");
        }

        Product p = Product.builder()
                .code(code)
                .name(req.name())
                .description(req.description())
                .categoryId(req.categoryId())
                .subCategoryId(req.subCategoryId())
                .brandId(req.brandId())
                .unitId(req.unitId())
                .cost(req.cost())
                .price(req.price())
                .wholesalePrice(req.wholesalePrice())
                .minPrice(req.minPrice())
                .points(Optional.ofNullable(req.points()).orElse(0))
                .taxMethod(Optional.ofNullable(req.taxMethod()).orElse(TaxMethod.EXCLUSIVE))
                .taxRate(Optional.ofNullable(req.taxRate()).orElse(java.math.BigDecimal.ZERO))
                .stockAlert(Optional.ofNullable(req.stockAlert()).orElse(0))
                .type(Optional.ofNullable(req.type()).orElse(ProductType.STANDARD))
                .status(Optional.ofNullable(req.status()).orElse(true))
                .sellable(Optional.ofNullable(req.sellable()).orElse(true))
                .featured(Boolean.TRUE.equals(req.featured()))
                .hideOnline(Boolean.TRUE.equals(req.hideOnline()))
                .imageUrl(req.imageUrl())
                .barcodeSymbology(Optional.ofNullable(req.barcodeSymbology()).filter(s -> !s.isBlank()).orElse("CODE128"))
                .warrantyMonths(req.warrantyMonths())
                .guaranteeMonths(req.guaranteeMonths())
                .lengthCm(req.lengthCm())
                .widthCm(req.widthCm())
                .heightCm(req.heightCm())
                .weightGrams(req.weightGrams())
                .trackSerial(Boolean.TRUE.equals(req.trackSerial()))
                .trackImei(Boolean.TRUE.equals(req.trackImei()))
                .variant(req.variants() != null && !req.variants().isEmpty())
                .tenantId(TenantContext.require())
                .build();

        if (req.variants() != null) {
            req.variants().forEach(v -> p.getVariants().add(
                    ProductVariant.builder()
                            .name(v.name())
                            .code(v.code())
                            .cost(v.cost())
                            .price(v.price())
                            .wholesalePrice(v.wholesalePrice())
                            .minPrice(v.minPrice())
                            .imageUrl(v.imageUrl())
                            .build()));
        }
        if (req.barcodes() != null) {
            req.barcodes().forEach(bc -> {
                if (barcodeRepo.existsByBarcode(bc.barcode())) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Barcode already exists: " + bc.barcode());
                }
                p.getBarcodes().add(ProductBarcode.builder()
                        .barcode(bc.barcode())
                        .barcodeType(bc.barcodeType() == null ? BarcodeType.CODE128
                                                              : BarcodeType.valueOf(bc.barcodeType()))
                        .primary(Boolean.TRUE.equals(bc.primary()))
                        .variantId(bc.variantId())
                        .build());
            });
        }
        // Combo composition — only meaningful when type=COMBO, but we accept the
        // payload regardless so callers can flip the type later without re-posting.
        if (req.comboItems() != null && !req.comboItems().isEmpty()) {
            int idx = 0;
            for (CreateProductRequest.ComboItemInput ci : req.comboItems()) {
                p.getComboItems().add(ProductComboItem.builder()
                        .componentProductId(ci.componentProductId())
                        .qty(ci.qty())
                        .unitCost(ci.unitCost())
                        .unitPrice(ci.unitPrice())
                        .position(ci.position() != null ? ci.position() : idx)
                        .build());
                idx++;
            }
        }

        Product saved = productRepo.save(p);
        emit("ProductCreated", saved);
        return ProductDto.from(saved);
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = RedisCacheConfig.CACHE_PRODUCT,  key = "#id"),
            @CacheEvict(value = RedisCacheConfig.CACHE_BARCODE,  allEntries = true)  // barcodes may have changed
    })
    public ProductDto update(UUID id, UpdateProductRequest req) {
        Product p = productRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));

        if (req.code() != null && !req.code().equalsIgnoreCase(p.getCode())) {
            if (productRepo.existsByCodeIgnoreCase(req.code())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "SKU already exists");
            }
            p.setCode(req.code());
        }
        if (req.name()           != null) p.setName(req.name());
        if (req.description()    != null) p.setDescription(req.description());
        if (req.categoryId()     != null) p.setCategoryId(req.categoryId());
        if (req.subCategoryId()  != null) p.setSubCategoryId(req.subCategoryId());
        if (req.brandId()        != null) p.setBrandId(req.brandId());
        if (req.unitId()         != null) p.setUnitId(req.unitId());
        if (req.cost()           != null) p.setCost(req.cost());
        if (req.price()          != null) p.setPrice(req.price());
        if (req.wholesalePrice() != null) p.setWholesalePrice(req.wholesalePrice());
        if (req.minPrice()       != null) p.setMinPrice(req.minPrice());
        if (req.points()         != null) p.setPoints(req.points());
        if (req.taxMethod()      != null) p.setTaxMethod(req.taxMethod());
        if (req.taxRate()        != null) p.setTaxRate(req.taxRate());
        if (req.stockAlert()     != null) p.setStockAlert(req.stockAlert());
        if (req.type()           != null) p.setType(req.type());
        if (req.status()         != null) p.setStatus(req.status());
        if (req.sellable()       != null) p.setSellable(req.sellable());
        if (req.featured()       != null) p.setFeatured(req.featured());
        if (req.hideOnline()     != null) p.setHideOnline(req.hideOnline());
        if (req.imageUrl()       != null) p.setImageUrl(req.imageUrl());
        if (req.barcodeSymbology() != null && !req.barcodeSymbology().isBlank())
            p.setBarcodeSymbology(req.barcodeSymbology());
        if (req.warrantyMonths()  != null) p.setWarrantyMonths(req.warrantyMonths());
        if (req.guaranteeMonths() != null) p.setGuaranteeMonths(req.guaranteeMonths());
        if (req.lengthCm()       != null) p.setLengthCm(req.lengthCm());
        if (req.widthCm()        != null) p.setWidthCm(req.widthCm());
        if (req.heightCm()       != null) p.setHeightCm(req.heightCm());
        if (req.weightGrams()    != null) p.setWeightGrams(req.weightGrams());
        if (req.trackSerial()    != null) p.setTrackSerial(req.trackSerial());
        if (req.trackImei()      != null) p.setTrackImei(req.trackImei());

        Product saved = productRepo.save(p);
        emit("ProductUpdated", saved);
        return ProductDto.from(saved);
    }

    /**
     * Bulk-create products. Each row runs in its own logical attempt so a
     * single bad row (duplicate SKU, missing field, etc.) does not lose
     * the whole batch — successful rows are committed, failed rows are
     * collected and returned to the caller.
     *
     * The method is intentionally NOT @Transactional at the outer level
     * because we want partial success semantics; individual saves still
     * inherit the @Transactional from {@link #create(CreateProductRequest)}.
     */
    public BulkCreateProductsResponse bulkCreate(BulkCreateProductsRequest req) {
        List<BulkCreateProductsResponse.Created> created = new ArrayList<>();
        List<BulkCreateProductsResponse.Failed>  failed  = new ArrayList<>();
        int idx = 0;
        for (CreateProductRequest item : req.items()) {
            try {
                ProductDto saved = create(item);
                created.add(new BulkCreateProductsResponse.Created(idx, saved.id(), saved.code(), saved.name()));
            } catch (ResponseStatusException e) {
                failed.add(new BulkCreateProductsResponse.Failed(idx, item.code(), item.name(),
                        e.getReason() == null ? e.getStatusCode().toString() : e.getReason()));
            } catch (Exception e) {
                log.warn("Bulk create row {} failed: {}", idx, e.getMessage());
                failed.add(new BulkCreateProductsResponse.Failed(idx, item.code(), item.name(),
                        e.getClass().getSimpleName() + ": " + e.getMessage()));
            }
            idx++;
        }
        return new BulkCreateProductsResponse(req.items().size(), created.size(), failed.size(), created, failed);
    }

    @Transactional
    @Caching(evict = {
            @CacheEvict(value = RedisCacheConfig.CACHE_PRODUCT, key = "#id"),
            @CacheEvict(value = RedisCacheConfig.CACHE_BARCODE, allEntries = true)
    })
    public void delete(UUID id) {
        Product p = productRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
        p.softDelete();
        productRepo.save(p);
        emit("ProductDeleted", p);
    }

    /**
     * Import products to update cost and retail price by matching product code.
     * Returns per-row results (partial success allowed).
     */
    @Transactional
    public ImportUpdateOnlyResponse importUpdateOnly(ImportUpdateOnlyRequest req) {
        int updated = 0, notFound = 0, errors = 0;
        List<String> messages = new ArrayList<>();
        for (ImportUpdateOnlyRequest.Item item : req.items()) {
            try {
                Product p = productRepo.findByCodeIgnoreCase(item.productCode())
                        .orElse(null);
                if (p == null) {
                    notFound++;
                    messages.add("Code not found: " + item.productCode());
                    continue;
                }
                p.setCost(item.cost());
                p.setPrice(item.retailPrice());
                productRepo.save(p);
                updated++;
            } catch (Exception e) {
                errors++;
                messages.add("Error updating " + item.productCode() + ": " + e.getMessage());
            }
        }
        return new ImportUpdateOnlyResponse(req.items().size(), updated, notFound, errors, messages);
    }

    /**
     * Import opening stock by product code. Publishes an outbox event so the
     * inventory service can apply the initial stock levels.
     */
    @Transactional
    public ImportOpeningStockResponse importOpeningStock(ImportOpeningStockRequest req) {
        int updated = 0, notFound = 0, errors = 0;
        List<Map<String, Object>> stockItems = new ArrayList<>();
        List<String> messages = new ArrayList<>();
        for (ImportOpeningStockRequest.Item item : req.items()) {
            try {
                Product p = productRepo.findByCodeIgnoreCase(item.productCode())
                        .orElse(null);
                if (p == null) {
                    notFound++;
                    messages.add("Product code not found: " + item.productCode());
                    continue;
                }
                UUID variantId = null;
                if (item.variantCode() != null && !item.variantCode().isBlank()) {
                    for (ProductVariant v : p.getVariants()) {
                        if (item.variantCode().equalsIgnoreCase(v.getCode())) {
                            variantId = v.getId();
                            break;
                        }
                    }
                    if (variantId == null) {
                        errors++;
                        messages.add("Variant code not found: " + item.variantCode() + " for product " + item.productCode());
                        continue;
                    }
                }
                stockItems.add(Map.of(
                        "productId", p.getId().toString(),
                        "variantId", variantId == null ? "" : variantId.toString(),
                        "qty", item.qty()
                ));
                updated++;
            } catch (Exception e) {
                errors++;
                messages.add("Error processing " + item.productCode() + ": " + e.getMessage());
            }
        }

        if (!stockItems.isEmpty()) {
            UUID countId = UUID.randomUUID();
            try {
                String payload = objectMapper.writeValueAsString(Map.of(
                        "openingStockId", countId.toString(),
                        "warehouseId", req.warehouseId().toString(),
                        "items", stockItems
                ));
                outboxRepo.save(OutboxEvent.builder()
                        .aggregateType("OpeningStock")
                        .aggregateId(countId)
                        .eventType("OpeningStockImported")
                        .payload(payload)
                        .build());
            } catch (JsonProcessingException e) {
                throw new IllegalStateException("Outbox serialize failed", e);
            }
            return new ImportOpeningStockResponse(
                    req.items().size(), updated, notFound, errors, countId, messages);
        }
        return new ImportOpeningStockResponse(req.items().size(), updated, notFound, errors, null, messages);
    }

    // ---- outbox helper ----
    private void emit(String eventType, Product p) {
        try {
            String payload = objectMapper.writeValueAsString(Map.of(
                    "productId", p.getId(),
                    "code",      p.getCode(),
                    "name",      p.getName(),
                    "cost",      p.getCost(),
                    "price",     p.getPrice(),
                    "status",    p.isStatus(),
                    "tenantId",  p.getTenantId() == null ? "" : p.getTenantId().toString()
            ));
            outboxRepo.save(OutboxEvent.builder()
                    .aggregateType("Product")
                    .aggregateId(p.getId())
                    .eventType(eventType)
                    .payload(payload)
                    .build());
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Outbox serialize failed", e);
        }
    }
}
