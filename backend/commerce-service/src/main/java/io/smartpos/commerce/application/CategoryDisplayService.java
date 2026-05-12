package io.smartpos.commerce.application;

import io.smartpos.commerce.domain.model.CategoryDisplay;
import io.smartpos.commerce.domain.repository.CategoryDisplayRepository;
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
public class CategoryDisplayService {

    private final CategoryDisplayRepository repository;

    @Transactional(readOnly = true)
    public List<CategoryDisplay> list(UUID storeId) {
        UUID tenantId = TenantContext.require();
        return repository.findByStoreIdAndTenantIdOrderByDisplayOrderAsc(storeId, tenantId);
    }

    @Transactional(readOnly = true)
    public List<CategoryDisplay> listVisible(UUID storeId) {
        UUID tenantId = TenantContext.require();
        return repository.findByStoreIdAndTenantIdAndIsVisibleTrueOrderByDisplayOrderAsc(storeId, tenantId);
    }

    @Transactional
    public CategoryDisplay add(UUID storeId, CategoryDisplay cd) {
        UUID tenantId = TenantContext.require();
        cd.setTenantId(tenantId);
        cd.setStoreId(storeId);
        return repository.save(cd);
    }

    @Transactional
    public CategoryDisplay update(UUID id, CategoryDisplay updates) {
        CategoryDisplay cd = repository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Category display not found"));
        if (updates.getNameOverride() != null) cd.setNameOverride(updates.getNameOverride());
        if (updates.getDescription() != null) cd.setDescription(updates.getDescription());
        if (updates.getImageUrl() != null) cd.setImageUrl(updates.getImageUrl());
        if (updates.getDisplayOrder() != cd.getDisplayOrder()) cd.setDisplayOrder(updates.getDisplayOrder());
        cd.setVisible(updates.isVisible());
        if (updates.getParentId() != null) cd.setParentId(updates.getParentId());
        return repository.save(cd);
    }

    @Transactional
    public void remove(UUID id) {
        CategoryDisplay cd = repository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Category display not found"));
        cd.softDelete();
        repository.save(cd);
    }
}
