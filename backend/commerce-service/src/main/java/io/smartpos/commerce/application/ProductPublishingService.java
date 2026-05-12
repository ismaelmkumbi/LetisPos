package io.smartpos.commerce.application;

import io.smartpos.commerce.domain.model.PublishedProduct;
import io.smartpos.commerce.domain.model.Store;
import io.smartpos.commerce.domain.repository.PublishedProductRepository;
import io.smartpos.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ProductPublishingService {

    private final PublishedProductRepository publishedProductRepository;
    private final StoreService storeService;

    @Transactional
    public PublishedProduct publish(UUID productId, UUID storeId, PublishRequest req) {
        UUID tenantId = TenantContext.getTenantId();
        publishedProductRepository.findByStoreIdAndProductId(storeId, productId)
            .ifPresent(pp -> { throw new IllegalArgumentException("Product is already published"); });

        PublishedProduct pp = PublishedProduct.builder()
            .tenantId(tenantId)
            .productId(productId)
            .storeId(storeId)
            .slug(req.slug != null ? req.slug : productId.toString())
            .metaTitle(req.metaTitle)
            .metaDescription(req.metaDescription)
            .ogImageUrl(req.ogImageUrl)
            .galleryUrls(req.galleryUrls)
            .featured(req.featured != null && req.featured)
            .displayOrder(req.displayOrder != null ? req.displayOrder : 0)
            .customPrice(req.customPrice)
            .build();
        return publishedProductRepository.save(pp);
    }

    @Transactional
    public void unpublish(UUID storeId, UUID productId) {
        PublishedProduct pp = publishedProductRepository.findByStoreIdAndProductId(storeId, productId)
            .orElseThrow(() -> new IllegalArgumentException("Product is not published"));
        pp.softDelete();
        publishedProductRepository.save(pp);
    }

    @Transactional(readOnly = true)
    public Page<PublishedProduct> listPublished(UUID storeId, String search, Pageable pageable) {
        UUID tenantId = TenantContext.getTenantId();
        return publishedProductRepository.searchPublished(storeId, tenantId, search, pageable);
    }

    @Transactional(readOnly = true)
    public Page<PublishedProduct> listFeatured(UUID storeId, Pageable pageable) {
        return publishedProductRepository.findByStoreIdAndFeaturedTrue(storeId, pageable);
    }

    @Transactional(readOnly = true)
    public PublishedProduct getBySlug(UUID storeId, String slug) {
        return publishedProductRepository.findByStoreIdAndSlug(storeId, slug)
            .orElseThrow(() -> new IllegalArgumentException("Published product not found: " + slug));
    }

    @Transactional
    public PublishedProduct update(UUID id, PublishRequest req) {
        PublishedProduct pp = publishedProductRepository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Published product not found"));
        if (req.metaTitle != null) pp.setMetaTitle(req.metaTitle);
        if (req.metaDescription != null) pp.setMetaDescription(req.metaDescription);
        if (req.ogImageUrl != null) pp.setOgImageUrl(req.ogImageUrl);
        if (req.galleryUrls != null) pp.setGalleryUrls(req.galleryUrls);
        if (req.featured != null) pp.setFeatured(req.featured);
        if (req.displayOrder != null) pp.setDisplayOrder(req.displayOrder);
        if (req.customPrice != null) pp.setCustomPrice(req.customPrice);
        if (req.slug != null) pp.setSlug(req.slug);
        return publishedProductRepository.save(pp);
    }

    public record PublishRequest(
        String slug, String metaTitle, String metaDescription,
        String ogImageUrl, List<String> galleryUrls,
        Boolean featured, Integer displayOrder, BigDecimal customPrice
    ) {}
}
