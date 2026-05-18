package io.smartpos.product.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.smartpos.product.api.dto.*;
import io.smartpos.product.domain.model.*;
import io.smartpos.common.context.TenantContext;
import io.smartpos.product.domain.repository.*;
import io.smartpos.product.infrastructure.config.RedisCacheConfig;
import jakarta.servlet.http.HttpServletResponse;
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

import java.io.IOException;
import java.io.PrintWriter;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepo;
    private final ProductBarcodeRepository barcodeRepo;
    private final PriceHistoryRepository priceHistoryRepo;
    private final OutboxRepository outboxRepo;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public Page<ProductDto> search(String search, UUID categoryId, UUID brandId,
                                   UUID supplierId, Boolean status, Boolean featured,
                                   Pageable pageable) {
        return productRepo.search(search, categoryId, brandId, supplierId, status, featured,
                TenantContext.get().orElse(null), pageable).map(ProductDto::from);
    }

    @Transactional(readOnly = true)
    @Cacheable(value = RedisCacheConfig.CACHE_PRODUCT, key = "#id")
    public ProductDto get(UUID id) {
        return productRepo.findById(id).map(ProductDto::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
    }

    @Transactional(readOnly = true)
    @Cacheable(value = RedisCacheConfig.CACHE_BARCODE, key = "#barcode")
    public BarcodeLookup lookupByBarcode(String barcode) {
        ProductBarcode b = barcodeRepo.findByBarcode(barcode)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Barcode not found"));
        return new BarcodeLookup(b.getProductId(), b.getVariantId());
    }

    public record BarcodeLookup(UUID productId, UUID variantId) {}

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
                .code(code).name(req.name()).description(req.description())
                .categoryId(req.categoryId()).subCategoryId(req.subCategoryId())
                .brandId(req.brandId()).unitId(req.unitId()).supplierId(req.supplierId())
                .cost(req.cost()).price(req.price())
                .wholesalePrice(req.wholesalePrice()).minPrice(req.minPrice())
                .points(Optional.ofNullable(req.points()).orElse(0))
                .taxMethod(Optional.ofNullable(req.taxMethod()).orElse(TaxMethod.EXCLUSIVE))
                .taxRate(Optional.ofNullable(req.taxRate()).orElse(BigDecimal.ZERO))
                .stockAlert(Optional.ofNullable(req.stockAlert()).orElse(0))
                .type(Optional.ofNullable(req.type()).orElse(ProductType.STANDARD))
                .status(Optional.ofNullable(req.status()).orElse(true))
                .sellable(Optional.ofNullable(req.sellable()).orElse(true))
                .featured(Boolean.TRUE.equals(req.featured()))
                .hideOnline(Boolean.TRUE.equals(req.hideOnline()))
                .imageUrl(req.imageUrl())
                .barcodeSymbology(Optional.ofNullable(req.barcodeSymbology()).filter(s -> !s.isBlank()).orElse("CODE128"))
                .warrantyMonths(req.warrantyMonths()).guaranteeMonths(req.guaranteeMonths())
                .lengthCm(req.lengthCm()).widthCm(req.widthCm()).heightCm(req.heightCm()).weightGrams(req.weightGrams())
                .trackSerial(Boolean.TRUE.equals(req.trackSerial())).trackImei(Boolean.TRUE.equals(req.trackImei()))
                .variant(req.variants() != null && !req.variants().isEmpty())
                .tenantId(TenantContext.require())
                .build();

        if (req.variants() != null) {
            req.variants().forEach(v -> p.getVariants().add(
                    ProductVariant.builder().name(v.name()).code(v.code())
                            .cost(v.cost()).price(v.price())
                            .wholesalePrice(v.wholesalePrice()).minPrice(v.minPrice())
                            .imageUrl(v.imageUrl()).build()));
        }
        if (req.barcodes() != null) {
            req.barcodes().forEach(bc -> {
                if (barcodeRepo.existsByBarcode(bc.barcode())) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Barcode already exists: " + bc.barcode());
                }
                p.getBarcodes().add(ProductBarcode.builder()
                        .barcode(bc.barcode())
                        .barcodeType(bc.barcodeType() == null ? BarcodeType.CODE128 : BarcodeType.valueOf(bc.barcodeType()))
                        .primary(Boolean.TRUE.equals(bc.primary())).variantId(bc.variantId()).build());
            });
        }
        if (req.comboItems() != null && !req.comboItems().isEmpty()) {
            int idx = 0;
            for (CreateProductRequest.ComboItemInput ci : req.comboItems()) {
                p.getComboItems().add(ProductComboItem.builder()
                        .componentProductId(ci.componentProductId()).qty(ci.qty())
                        .unitCost(ci.unitCost()).unitPrice(ci.unitPrice())
                        .position(ci.position() != null ? ci.position() : idx).build());
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
            @CacheEvict(value = RedisCacheConfig.CACHE_BARCODE,  allEntries = true)
    })
    public ProductDto update(UUID id, UpdateProductRequest req, UUID userId) {
        Product p = productRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));

        trackPriceChange(p, "cost", p.getCost(), req.cost(), userId);
        trackPriceChange(p, "price", p.getPrice(), req.price(), userId);
        trackPriceChange(p, "wholesale_price", p.getWholesalePrice(), req.wholesalePrice(), userId);
        trackPriceChange(p, "min_price", p.getMinPrice(), req.minPrice(), userId);

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
        if (req.supplierId()     != null) p.setSupplierId(req.supplierId());
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

        // Replace variants if provided
        if (req.variants() != null) {
            p.getVariants().clear();
            req.variants().forEach(v -> p.getVariants().add(
                    ProductVariant.builder().name(v.name()).code(v.code())
                            .cost(v.cost()).price(v.price())
                            .wholesalePrice(v.wholesalePrice()).minPrice(v.minPrice())
                            .imageUrl(v.imageUrl()).build()));
            p.setVariant(!req.variants().isEmpty());
        }

        // Replace barcodes if provided
        if (req.barcodes() != null) {
            p.getBarcodes().clear();
            req.barcodes().forEach(bc -> {
                if (barcodeRepo.existsByBarcode(bc.barcode())) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Barcode already exists: " + bc.barcode());
                }
                p.getBarcodes().add(ProductBarcode.builder()
                        .barcode(bc.barcode())
                        .barcodeType(bc.barcodeType() == null ? BarcodeType.CODE128 : BarcodeType.valueOf(bc.barcodeType()))
                        .primary(Boolean.TRUE.equals(bc.primary())).variantId(bc.variantId()).build());
            });
        }

        Product saved = productRepo.save(p);
        emit("ProductUpdated", saved);
        return ProductDto.from(saved);
    }

    // ---- Duplicate ----

    @Transactional
    public ProductDto duplicate(UUID id, DuplicateProductRequest req) {
        Product src = productRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));

        String code = (req.code() == null || req.code().isBlank()) ? nextSku() : req.code();
        if (productRepo.existsByCodeIgnoreCase(code)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "SKU already exists");
        }

        Product p = Product.builder()
                .code(code).name(req.name()).description(src.getDescription())
                .categoryId(req.categoryId() != null ? req.categoryId() : src.getCategoryId())
                .subCategoryId(src.getSubCategoryId())
                .brandId(req.brandId() != null ? req.brandId() : src.getBrandId())
                .unitId(req.unitId() != null ? req.unitId() : src.getUnitId())
                .supplierId(req.supplierId() != null ? req.supplierId() : src.getSupplierId())
                .cost(src.getCost()).price(src.getPrice())
                .wholesalePrice(src.getWholesalePrice()).minPrice(src.getMinPrice())
                .points(src.getPoints())
                .taxMethod(src.getTaxMethod()).taxRate(src.getTaxRate())
                .stockAlert(src.getStockAlert()).type(src.getType())
                .status(true).sellable(src.isSellable()).featured(false).hideOnline(false)
                .barcodeSymbology(src.getBarcodeSymbology())
                .warrantyMonths(src.getWarrantyMonths()).guaranteeMonths(src.getGuaranteeMonths())
                .lengthCm(src.getLengthCm()).widthCm(src.getWidthCm())
                .heightCm(src.getHeightCm()).weightGrams(src.getWeightGrams())
                .trackSerial(src.isTrackSerial()).trackImei(src.isTrackImei())
                .tenantId(TenantContext.require())
                .build();

        if (Boolean.TRUE.equals(req.copyVariants()) && !src.getVariants().isEmpty()) {
            src.getVariants().forEach(v -> p.getVariants().add(
                    ProductVariant.builder().name(v.getName()).code(v.getCode())
                            .cost(v.getCost()).price(v.getPrice())
                            .wholesalePrice(v.getWholesalePrice()).minPrice(v.getMinPrice())
                            .imageUrl(v.getImageUrl()).build()));
            p.setVariant(true);
        }

        if (Boolean.TRUE.equals(req.copyBarcodes()) && !src.getBarcodes().isEmpty()) {
            src.getBarcodes().forEach(b -> p.getBarcodes().add(ProductBarcode.builder()
                    .barcode(b.getBarcode()).barcodeType(b.getBarcodeType())
                    .primary(b.isPrimary()).variantId(b.getVariantId()).build()));
        }

        Product saved = productRepo.save(p);
        emit("ProductCreated", saved);
        return ProductDto.from(saved);
    }

    // ---- Bulk operations ----

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
    public int batchStatus(BatchStatusRequest req) {
        int count = 0;
        for (UUID id : req.productIds()) {
            Product p = productRepo.findById(id).orElse(null);
            if (p != null) { p.setStatus(req.status()); productRepo.save(p); count++; }
        }
        return count;
    }

    @Transactional
    public BulkPriceUpdateResponse bulkPriceUpdate(BulkPriceUpdateRequest req) {
        List<String> messages = new ArrayList<>();
        int matched = 0, updated = 0, errors = 0;
        UUID tenantId = TenantContext.require();

        // Collect matching products
        List<Product> targets;
        if (req.scope().productIds() != null && !req.scope().productIds().isEmpty()) {
            targets = productRepo.findAllById(req.scope().productIds());
        } else if (req.scope().categoryId() != null || req.scope().brandId() != null) {
            targets = productRepo.search(null, req.scope().categoryId(), req.scope().brandId(),
                    null, true, null, tenantId, Pageable.unpaged()).getContent();
        } else {
            return new BulkPriceUpdateResponse(0, 0, 1, List.of("No scope specified — provide categoryId, brandId, or productIds"));
        }

        matched = targets.size();
        for (Product p : targets) {
            try {
                for (BulkPriceUpdateRequest.FieldUpdate upd : req.updates()) {
                    BigDecimal oldVal = getField(p, upd.field());
                    BigDecimal newVal = computeNew(oldVal, upd.value(), upd.mode());
                    setField(p, upd.field(), newVal);
                }
                productRepo.save(p);
                updated++;
            } catch (Exception e) {
                errors++;
                messages.add("Error updating " + p.getCode() + ": " + e.getMessage());
            }
        }
        return new BulkPriceUpdateResponse(matched, updated, errors, messages);
    }

    // ---- CSV Export ----

    @Transactional(readOnly = true)
    public void exportCsv(String search, UUID categoryId, UUID brandId, Boolean status,
                          Boolean featured, HttpServletResponse response) throws IOException {
        response.setContentType("text/csv");
        response.setHeader("Content-Disposition", "attachment; filename=products.csv");
        UUID tenantId = TenantContext.get().orElse(null);
        List<Product> products = productRepo.search(search, categoryId, brandId, null, status, featured,
                tenantId, Pageable.unpaged()).getContent();

        try (PrintWriter w = response.getWriter()) {
            w.println("Code,Name,Category,Brand,Unit,Supplier,Cost,Price,WholesalePrice,MinPrice,"
                    + "TaxMethod,TaxRate,StockAlert,Type,Status,Sellable,BarcodeSymbology");
            for (Product p : products) {
                w.printf("%s,\"%s\",%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%d,%s,%s,%s,%s%n",
                        csv(p.getCode()), csv(p.getName()),
                        csv(p.getCategoryId()), csv(p.getBrandId()), csv(p.getUnitId()),
                        csv(p.getSupplierId()),
                        p.getCost(), p.getPrice(), p.getWholesalePrice(), p.getMinPrice(),
                        p.getTaxMethod(), p.getTaxRate(), p.getStockAlert(), p.getType(),
                        p.isStatus(), p.isSellable(), p.getBarcodeSymbology());
            }
        }
    }

    // ---- Delete ----

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

    // ---- Import ----

    @Transactional
    public ImportUpdateOnlyResponse importUpdateOnly(ImportUpdateOnlyRequest req) {
        int updated = 0, notFound = 0, errors = 0;
        List<String> messages = new ArrayList<>();
        for (ImportUpdateOnlyRequest.Item item : req.items()) {
            try {
                Product p = productRepo.findByCodeIgnoreCase(item.productCode()).orElse(null);
                if (p == null) { notFound++; messages.add("Code not found: " + item.productCode()); continue; }
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

    @Transactional
    public ImportOpeningStockResponse importOpeningStock(ImportOpeningStockRequest req) {
        int updated = 0, notFound = 0, errors = 0;
        List<Map<String, Object>> stockItems = new ArrayList<>();
        List<String> messages = new ArrayList<>();
        for (ImportOpeningStockRequest.Item item : req.items()) {
            try {
                Product p = productRepo.findByCodeIgnoreCase(item.productCode()).orElse(null);
                if (p == null) { notFound++; messages.add("Product code not found: " + item.productCode()); continue; }
                UUID variantId = null;
                if (item.variantCode() != null && !item.variantCode().isBlank()) {
                    for (ProductVariant v : p.getVariants()) {
                        if (item.variantCode().equalsIgnoreCase(v.getCode())) { variantId = v.getId(); break; }
                    }
                    if (variantId == null) {
                        errors++;
                        messages.add("Variant code not found: " + item.variantCode()); continue;
                    }
                }
                stockItems.add(Map.of("productId", p.getId().toString(),
                        "variantId", variantId == null ? "" : variantId.toString(), "qty", item.qty()));
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
                        "warehouseId", req.warehouseId().toString(), "items", stockItems));
                outboxRepo.save(OutboxEvent.builder()
                        .aggregateType("OpeningStock").aggregateId(countId)
                        .eventType("OpeningStockImported").payload(payload).build());
            } catch (JsonProcessingException e) {
                throw new IllegalStateException("Outbox serialize failed", e);
            }
            return new ImportOpeningStockResponse(req.items().size(), updated, notFound, errors, countId, messages);
        }
        return new ImportOpeningStockResponse(req.items().size(), updated, notFound, errors, null, messages);
    }

    // ---- Price history ----

    @Transactional(readOnly = true)
    public Page<PriceHistory> priceHistory(UUID productId, Pageable pageable) {
        return priceHistoryRepo.findByProductIdOrderByChangedAtDesc(productId, pageable);
    }

    // ----------------------------------------------------------------
    // helpers
    // ----------------------------------------------------------------

    private void trackPriceChange(Product p, String field, BigDecimal oldVal, BigDecimal newVal, UUID userId) {
        if (newVal == null || newVal.compareTo(oldVal == null ? BigDecimal.ZERO : oldVal) == 0) return;
        priceHistoryRepo.save(PriceHistory.builder()
                .productId(p.getId()).fieldName(field)
                .oldValue(oldVal).newValue(newVal)
                .changedBy(userId).tenantId(p.getTenantId())
                .build());
    }

    private BigDecimal getField(Product p, BulkPriceUpdateRequest.Field field) {
        return switch (field) {
            case cost -> p.getCost();
            case price -> p.getPrice();
            case wholesale_price -> p.getWholesalePrice() == null ? BigDecimal.ZERO : p.getWholesalePrice();
            case min_price -> p.getMinPrice() == null ? BigDecimal.ZERO : p.getMinPrice();
        };
    }

    private void setField(Product p, BulkPriceUpdateRequest.Field field, BigDecimal val) {
        switch (field) {
            case cost -> p.setCost(val);
            case price -> p.setPrice(val);
            case wholesale_price -> p.setWholesalePrice(val);
            case min_price -> p.setMinPrice(val);
        }
    }

    private BigDecimal computeNew(BigDecimal current, BigDecimal value, BulkPriceUpdateRequest.UpdateMode mode) {
        return switch (mode) {
            case SET              -> value;
            case INCREASE         -> current.add(value);
            case DECREASE         -> current.subtract(value);
            case INCREASE_PERCENT -> current.multiply(BigDecimal.ONE.add(value.divide(
                    new BigDecimal("100"), 4, RoundingMode.HALF_UP)));
            case DECREASE_PERCENT -> current.multiply(BigDecimal.ONE.subtract(value.divide(
                    new BigDecimal("100"), 4, RoundingMode.HALF_UP)));
        };
    }

    private static String csv(Object o) {
        return o == null ? "" : o.toString().replace("\"", "\"\"");
    }

    private void emit(String eventType, Product p) {
        try {
            String payload = objectMapper.writeValueAsString(Map.of(
                    "productId", p.getId(), "code", p.getCode(), "name", p.getName(),
                    "cost", p.getCost(), "price", p.getPrice(),
                    "status", p.isStatus(),
                    "tenantId", p.getTenantId() == null ? "" : p.getTenantId().toString()));
            outboxRepo.save(OutboxEvent.builder()
                    .aggregateType("Product").aggregateId(p.getId())
                    .eventType(eventType).payload(payload).build());
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Outbox serialize failed", e);
        }
    }
}
