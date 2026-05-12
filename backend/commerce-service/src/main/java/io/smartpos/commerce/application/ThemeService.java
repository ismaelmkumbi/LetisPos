package io.smartpos.commerce.application;

import io.smartpos.commerce.domain.model.Theme;
import io.smartpos.commerce.domain.repository.ThemeRepository;
import io.smartpos.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ThemeService {

    private final ThemeRepository repository;

    @Transactional(readOnly = true)
    public Theme getTheme(UUID storeId) {
        UUID tenantId = TenantContext.require();
        return repository.findByStoreId(storeId)
            .orElseGet(() -> createDefault(tenantId, storeId));
    }

    @Transactional
    public Theme createDefault(UUID tenantId, UUID storeId) {
        Theme theme = Theme.builder()
            .tenantId(tenantId)
            .storeId(storeId)
            .name("Default")
            .settings("{}")
            .isActive(true)
            .build();
        return repository.save(theme);
    }

    @Transactional
    public Theme updateTheme(UUID storeId, Theme updates) {
        Theme theme = getTheme(storeId);
        if (updates.getSettings() != null) {
            theme.setSettings(updates.getSettings());
        }
        if (updates.getName() != null) {
            theme.setName(updates.getName());
        }
        theme.setActive(updates.isActive());
        return repository.save(theme);
    }
}
