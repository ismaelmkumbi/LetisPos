package io.smartpos.product.api;

import io.smartpos.product.api.dto.*;
import io.smartpos.product.application.ProductBatchService;
import io.smartpos.product.application.ProductService;
import io.smartpos.product.domain.model.PriceHistory;
import io.smartpos.product.domain.model.ProductBatch;
import io.smartpos.product.infrastructure.storage.ImageUploadService;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;
    private final ProductBatchService batchService;
    private final ImageUploadService imageUploadService;

    @GetMapping
    @PreAuthorize("hasAuthority('product.view')")
    public Page<ProductDto> search(@RequestParam(required = false) String search,
                                   @RequestParam(required = false) UUID categoryId,
                                   @RequestParam(required = false) UUID brandId,
                                   @RequestParam(required = false) UUID supplierId,
                                   @RequestParam(required = false) Boolean status,
                                   @RequestParam(required = false) Boolean featured,
                                   Pageable pageable) {
        return productService.search(search, categoryId, brandId, supplierId, status, featured, pageable);
    }

    @GetMapping("/export")
    @PreAuthorize("hasAuthority('product.view')")
    public void exportCsv(@RequestParam(required = false) String search,
                          @RequestParam(required = false) UUID categoryId,
                          @RequestParam(required = false) UUID brandId,
                          @RequestParam(required = false) Boolean status,
                          @RequestParam(required = false) Boolean featured,
                          HttpServletResponse response) throws IOException {
        productService.exportCsv(search, categoryId, brandId, status, featured, response);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('product.view')")
    public ProductDto get(@PathVariable UUID id) { return productService.get(id); }

    @GetMapping("/{id}/price-history")
    @PreAuthorize("hasAuthority('product.view')")
    public Page<PriceHistory> priceHistory(@PathVariable UUID id, Pageable pageable) {
        return productService.priceHistory(id, pageable);
    }

    @GetMapping("/by-barcode/{barcode}")
    @PreAuthorize("hasAuthority('product.view') or hasAuthority('pos.use')")
    public ProductDto byBarcode(@PathVariable String barcode) {
        ProductService.BarcodeLookup lookup = productService.lookupByBarcode(barcode);
        return productService.get(lookup.productId());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('product.create')")
    public ResponseEntity<ProductDto> create(@Valid @RequestBody CreateProductRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productService.create(req));
    }

    @PostMapping("/{id}/duplicate")
    @PreAuthorize("hasAuthority('product.create')")
    public ResponseEntity<ProductDto> duplicate(@PathVariable UUID id,
                                                 @Valid @RequestBody DuplicateProductRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productService.duplicate(id, req));
    }

    @GetMapping("/next-sku")
    @PreAuthorize("hasAuthority('product.create')")
    public NextSkuResponse nextSku() {
        return new NextSkuResponse(productService.nextSku());
    }

    public record NextSkuResponse(String code) {}

    @PostMapping("/bulk")
    @PreAuthorize("hasAuthority('product.create')")
    public BulkCreateProductsResponse bulkCreate(@Valid @RequestBody BulkCreateProductsRequest req) {
        return productService.bulkCreate(req);
    }

    @PostMapping("/batch-status")
    @PreAuthorize("hasAuthority('product.update')")
    public BatchStatusResult batchStatus(@Valid @RequestBody BatchStatusRequest req) {
        int count = productService.batchStatus(req);
        return new BatchStatusResult(count);
    }

    public record BatchStatusResult(int updated) {}

    @PostMapping("/price/bulk-update")
    @PreAuthorize("hasAuthority('product.update')")
    public BulkPriceUpdateResponse bulkPriceUpdate(@Valid @RequestBody BulkPriceUpdateRequest req) {
        return productService.bulkPriceUpdate(req);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('product.update')")
    public ProductDto update(@PathVariable UUID id, @RequestBody UpdateProductRequest req,
                              @AuthenticationPrincipal Jwt jwt) {
        UUID userId = jwt != null ? UUID.fromString(jwt.getSubject()) : null;
        return productService.update(id, req, userId);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('product.delete')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) { productService.delete(id); }

    @PostMapping("/import/update-only")
    @PreAuthorize("hasAuthority('product.update')")
    public ImportUpdateOnlyResponse importUpdateOnly(@Valid @RequestBody ImportUpdateOnlyRequest req) {
        return productService.importUpdateOnly(req);
    }

    @PostMapping("/import/opening-stock")
    @PreAuthorize("hasAuthority('stock.count')")
    public ImportOpeningStockResponse importOpeningStock(@Valid @RequestBody ImportOpeningStockRequest req) {
        return productService.importOpeningStock(req);
    }

    @PostMapping(value = "/images", consumes = "multipart/form-data")
    @PreAuthorize("hasAuthority('product.create')")
    public ResponseEntity<ImageUploadResponse> uploadImage(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File is empty");
        }
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only image files are accepted. Got: " + contentType);
        }
        if (file.getSize() > 10 * 1024 * 1024) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE, "Image must be under 10 MB");
        }
        String originalName = file.getOriginalFilename();
        String ext = "jpg";
        if (originalName != null && originalName.contains(".")) {
            ext = originalName.substring(originalName.lastIndexOf('.') + 1).toLowerCase();
        } else if ("image/png".equals(contentType)) { ext = "png";
        } else if ("image/webp".equals(contentType)) { ext = "webp";
        } else if ("image/gif".equals(contentType)) { ext = "gif"; }
        try {
            String url = imageUploadService.upload(file.getBytes(), ext, contentType);
            return ResponseEntity.status(HttpStatus.CREATED).body(new ImageUploadResponse(url));
        } catch (Exception e) {
            log.error("Image upload failed", e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Failed to upload image: " + e.getMessage());
        }
    }

    // ---- Batches ----

    @GetMapping("/batches")
    @PreAuthorize("hasAuthority('product.view')")
    public List<ProductBatch> listBatches() { return batchService.list(); }

    @GetMapping("/{productId}/batches")
    @PreAuthorize("hasAuthority('product.view')")
    public List<ProductBatch> productBatches(@PathVariable UUID productId) {
        return batchService.byProduct(productId);
    }

    @GetMapping("/batches/expiring")
    @PreAuthorize("hasAuthority('product.view')")
    public List<ProductBatch> expiringBatches(@RequestParam(defaultValue = "#{T(java.time.LocalDate).now().plusDays(30)}") LocalDate before) {
        return batchService.expiring(before);
    }

    @PostMapping("/batches")
    @PreAuthorize("hasAuthority('product.update')")
    public ResponseEntity<ProductBatch> createBatch(@RequestBody ProductBatch batch) {
        return ResponseEntity.status(HttpStatus.CREATED).body(batchService.create(batch));
    }

    @PutMapping("/batches/{id}")
    @PreAuthorize("hasAuthority('product.update')")
    public ProductBatch updateBatch(@PathVariable UUID id, @RequestBody ProductBatch batch) {
        return batchService.update(id, batch);
    }

    @DeleteMapping("/batches/{id}")
    @PreAuthorize("hasAuthority('product.update')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteBatch(@PathVariable UUID id) { batchService.delete(id); }

    // ---- File import (CSV) ----

    @PostMapping(value = "/import/file", consumes = "multipart/form-data")
    @PreAuthorize("hasAuthority('product.create')")
    public BulkCreateProductsResponse importFile(@RequestParam("file") MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File is empty");
        }
        List<CreateProductRequest> items = new ArrayList<>();
        try (BufferedReader r = new BufferedReader(new InputStreamReader(file.getInputStream()))) {
            String header = r.readLine();
            String line;
            while ((line = r.readLine()) != null) {
                String[] cols = line.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)", -1);
                if (cols.length < 5) continue;
                String code = clean(cols[0]);
                String name = clean(cols[1]);
                BigDecimal cost = cols.length > 2 ? parseDecimal(cols[2]) : BigDecimal.ZERO;
                BigDecimal price = cols.length > 3 ? parseDecimal(cols[3]) : BigDecimal.ZERO;
                items.add(new CreateProductRequest(code, name, null, null, null, null, null,
                        cost, price, null, null, null, null, null, null, null,
                        true, true, false, false, null, "CODE128", null, null,
                        null, null, null, null, false, false, null, null, null, null));
            }
        }
        return productService.bulkCreate(new BulkCreateProductsRequest(items));
    }

    private static String clean(String s) {
        if (s == null) return "";
        return s.replaceAll("^\"|\"$", "").trim();
    }

    private static BigDecimal parseDecimal(String s) {
        try { return new BigDecimal(clean(s)); } catch (Exception e) { return BigDecimal.ZERO; }
    }
}
