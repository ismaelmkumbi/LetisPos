package io.smartpos.commerce.application;

import io.smartpos.commerce.domain.model.MarketingBanner;
import io.smartpos.commerce.domain.repository.MarketingBannerRepository;
import io.smartpos.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class BannerService {

    private final MarketingBannerRepository repository;

    @Transactional(readOnly = true)
    public List<MarketingBanner> listAll(UUID storeId) {
        UUID tenantId = TenantContext.require();
        return repository.findByStoreIdAndTenantIdOrderByDisplayOrderAsc(storeId, tenantId);
    }

    @Transactional(readOnly = true)
    public List<MarketingBanner> listActive(UUID storeId) {
        return repository.findByStoreIdAndIsActiveTrue(storeId);
    }

    @Transactional
    public MarketingBanner create(UUID storeId, MarketingBanner banner) {
        UUID tenantId = TenantContext.require();
        banner.setTenantId(tenantId);
        banner.setStoreId(storeId);
        return repository.save(banner);
    }

    @Transactional
    public MarketingBanner update(UUID id, MarketingBanner updates) {
        MarketingBanner banner = repository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Banner not found"));
        if (updates.getTitle() != null) banner.setTitle(updates.getTitle());
        if (updates.getSubtitle() != null) banner.setSubtitle(updates.getSubtitle());
        if (updates.getImageUrl() != null) banner.setImageUrl(updates.getImageUrl());
        if (updates.getLinkUrl() != null) banner.setLinkUrl(updates.getLinkUrl());
        if (updates.getLinkText() != null) banner.setLinkText(updates.getLinkText());
        if (updates.getBackgroundColor() != null) banner.setBackgroundColor(updates.getBackgroundColor());
        if (updates.getTextColor() != null) banner.setTextColor(updates.getTextColor());
        banner.setDisplayOrder(updates.getDisplayOrder());
        banner.setActive(updates.isActive());
        if (updates.getStartsAt() != null) banner.setStartsAt(updates.getStartsAt());
        if (updates.getEndsAt() != null) banner.setEndsAt(updates.getEndsAt());
        return repository.save(banner);
    }

    @Transactional
    public void delete(UUID id) {
        MarketingBanner banner = repository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Banner not found"));
        banner.softDelete();
        repository.save(banner);
    }
}
