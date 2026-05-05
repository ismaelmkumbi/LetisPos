package io.smartpos.product.api;

import io.smartpos.product.api.dto.BulkCreateProductsRequest;
import io.smartpos.product.api.dto.BulkCreateProductsResponse;
import io.smartpos.product.api.dto.CreateProductRequest;
import io.smartpos.product.api.dto.ImageUploadResponse;
import io.smartpos.product.api.dto.ImportOpeningStockRequest;
import io.smartpos.product.api.dto.ImportOpeningStockResponse;
import io.smartpos.product.api.dto.ImportUpdateOnlyRequest;
import io.smartpos.product.api.dto.ImportUpdateOnlyResponse;
import io.smartpos.product.api.dto.ProductDto;
import io.smartpos.product.api.dto.UpdateProductRequest;
import io.smartpos.product.application.ProductService;
import io.smartpos.product.infrastructure.storage.ImageUploadService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;
    private final ImageUploadService imageUploadService;

    @GetMapping
    @PreAuthorize("hasAuthority('product.view')")
    public Page<ProductDto> search(@RequestParam(required = false) String search,
                                   @RequestParam(required = false) UUID categoryId,
                                   @RequestParam(required = false) UUID brandId,
                                   @RequestParam(required = false) Boolean status,
                                   @RequestParam(required = false) Boolean featured,
                                   Pageable pageable) {
        return productService.search(search, categoryId, brandId, status, featured, pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('product.view')")
    public ProductDto get(@PathVariable UUID id) { return productService.get(id); }

    @GetMapping("/by-barcode/{barcode}")
    @PreAuthorize("hasAuthority('product.view') or hasAuthority('pos.use')")
    public ProductDto byBarcode(@PathVariable String barcode) {
        // Two-step: barcode → productId, then id → ProductDto (both cached).
        ProductService.BarcodeLookup lookup = productService.lookupByBarcode(barcode);
        return productService.get(lookup.productId());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('product.create')")
    public ResponseEntity<ProductDto> create(@Valid @RequestBody CreateProductRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productService.create(req));
    }

    /**
     * Mint and return the next available SKU (e.g. {@code PROD-000042}). Each
     * call consumes a value from {@code product_code_seq}, so the UI's
     * "Generate" button receives a guaranteed-unique code it can show in the
     * form. Cancelling the form simply leaves a gap — uniqueness is preserved.
     */
    @GetMapping("/next-sku")
    @PreAuthorize("hasAuthority('product.create')")
    public NextSkuResponse nextSku() {
        return new NextSkuResponse(productService.nextSku());
    }

    public record NextSkuResponse(String code) {}

    /**
     * Bulk create — typically called by the AI import wizard.
     * Returns 200 with per-row created/failed details (partial success allowed).
     */
    @PostMapping("/bulk")
    @PreAuthorize("hasAuthority('product.create')")
    public BulkCreateProductsResponse bulkCreate(@Valid @RequestBody BulkCreateProductsRequest req) {
        return productService.bulkCreate(req);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('product.update')")
    public ProductDto update(@PathVariable UUID id, @RequestBody UpdateProductRequest req) {
        return productService.update(id, req);
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
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Only image files are accepted. Got: " + contentType);
        }
        if (file.getSize() > 5 * 1024 * 1024) {
            throw new ResponseStatusException(HttpStatus.PAYLOAD_TOO_LARGE,
                    "Image must be under 5 MB");
        }
        String originalName = file.getOriginalFilename();
        String ext = "jpg";
        if (originalName != null && originalName.contains(".")) {
            ext = originalName.substring(originalName.lastIndexOf('.') + 1).toLowerCase();
        } else if ("image/png".equals(contentType)) {
            ext = "png";
        } else if ("image/webp".equals(contentType)) {
            ext = "webp";
        } else if ("image/gif".equals(contentType)) {
            ext = "gif";
        }
        try {
            String url = imageUploadService.upload(file.getBytes(), ext, contentType);
            return ResponseEntity.status(HttpStatus.CREATED).body(new ImageUploadResponse(url));
        } catch (Exception e) {
            log.error("Image upload failed", e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Failed to upload image: " + e.getMessage());
        }
    }
}
