package io.smartpos.commerce.api.admin;

import io.smartpos.commerce.api.dto.admin.PublishProductRequest;
import io.smartpos.commerce.api.dto.admin.PublishedProductDto;
import io.smartpos.commerce.application.ProductPublishingService;
import io.smartpos.commerce.application.StoreService;
import io.smartpos.commerce.domain.model.PublishedProduct;
import io.smartpos.commerce.domain.model.Store;
import io.smartpos.common.context.TenantContext;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/commerce/products")
@RequiredArgsConstructor
public class ProductPublishingController {

    private final ProductPublishingService publishingService;
    private final StoreService storeService;

    @GetMapping
    @PreAuthorize("hasAuthority('commerce.products')")
    public Page<PublishedProductDto> list(
        @RequestParam(required = false) String search,
        Pageable pageable) {
        UUID tenantId = TenantContext.require();
        Store store = storeService.getByTenant(tenantId);
        return publishingService.listPublished(store.getId(), search, null, pageable)
            .map(PublishedProductDto::from);
    }

    @PostMapping("/publish")
    @PreAuthorize("hasAuthority('commerce.products')")
    public ResponseEntity<PublishedProductDto> publish(@Valid @RequestBody PublishProductRequest req) {
        UUID tenantId = TenantContext.require();
        Store store = storeService.getByTenant(tenantId);
        PublishedProduct pp = publishingService.publish(
            req.productId(), store.getId(),
            new ProductPublishingService.PublishRequest(
                req.slug(), req.metaTitle(), req.metaDescription(),
                req.ogImageUrl(), req.galleryUrls(),
                req.featured(), req.displayOrder(), req.customPrice()
            ));
        return ResponseEntity.status(HttpStatus.CREATED).body(PublishedProductDto.from(pp));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('commerce.products')")
    public PublishedProductDto update(@PathVariable UUID id, @RequestBody PublishProductRequest req) {
        PublishedProduct pp = publishingService.update(id,
            new ProductPublishingService.PublishRequest(
                req.slug(), req.metaTitle(), req.metaDescription(),
                req.ogImageUrl(), req.galleryUrls(),
                req.featured(), req.displayOrder(), req.customPrice()
            ));
        return PublishedProductDto.from(pp);
    }

    @DeleteMapping("/{productId}/unpublish")
    @PreAuthorize("hasAuthority('commerce.products')")
    public ResponseEntity<Void> unpublish(@PathVariable UUID productId) {
        UUID tenantId = TenantContext.require();
        Store store = storeService.getByTenant(tenantId);
        publishingService.unpublish(store.getId(), productId);
        return ResponseEntity.noContent().build();
    }
}
