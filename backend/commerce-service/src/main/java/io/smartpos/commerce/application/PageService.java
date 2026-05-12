package io.smartpos.commerce.application;

import io.smartpos.commerce.domain.model.StorePage;
import io.smartpos.commerce.domain.repository.StorePageRepository;
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
public class PageService {

    private final StorePageRepository repository;

    @Transactional(readOnly = true)
    public List<StorePage> listByStore(UUID storeId) {
        UUID tenantId = TenantContext.require();
        return repository.findByStoreIdAndTenantIdOrderByCreatedAtDesc(storeId, tenantId);
    }

    @Transactional(readOnly = true)
    public StorePage getByKey(UUID storeId, String key) {
        return repository.findByStoreIdAndKey(storeId, key)
            .orElseThrow(() -> new IllegalArgumentException("Page not found: " + key));
    }

    @Transactional
    public StorePage create(UUID storeId, StorePage page) {
        UUID tenantId = TenantContext.require();
        page.setTenantId(tenantId);
        page.setStoreId(storeId);
        return repository.save(page);
    }

    @Transactional
    public StorePage update(UUID id, StorePage updates) {
        StorePage page = repository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Page not found"));
        if (updates.getTitle() != null) page.setTitle(updates.getTitle());
        if (updates.getKey() != null) page.setKey(updates.getKey());
        if (updates.getContent() != null) page.setContent(updates.getContent());
        if (updates.getMetaTitle() != null) page.setMetaTitle(updates.getMetaTitle());
        if (updates.getMetaDescription() != null) page.setMetaDescription(updates.getMetaDescription());
        page.setPublished(updates.isPublished());
        return repository.save(page);
    }

    @Transactional
    public void delete(UUID id) {
        StorePage page = repository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Page not found"));
        page.softDelete();
        repository.save(page);
    }
}
