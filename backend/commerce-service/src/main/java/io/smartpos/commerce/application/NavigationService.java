package io.smartpos.commerce.application;

import io.smartpos.commerce.domain.model.NavigationMenu;
import io.smartpos.commerce.domain.repository.NavigationMenuRepository;
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
public class NavigationService {

    private final NavigationMenuRepository repository;

    @Transactional(readOnly = true)
    public NavigationMenu getMenu(UUID storeId, String location) {
        UUID tenantId = TenantContext.require();
        return repository.findByStoreIdAndLocation(storeId, location)
            .orElseGet(() -> createDefault(tenantId, storeId, location));
    }

    @Transactional
    public NavigationMenu createDefault(UUID tenantId, UUID storeId, String location) {
        NavigationMenu menu = NavigationMenu.builder()
            .tenantId(tenantId)
            .storeId(storeId)
            .location(location)
            .items("[]")
            .build();
        return repository.save(menu);
    }

    @Transactional
    public NavigationMenu updateMenu(UUID storeId, String location, String itemsJson) {
        UUID tenantId = TenantContext.require();
        NavigationMenu menu = repository.findByStoreIdAndLocation(storeId, location)
            .orElseGet(() -> createDefault(tenantId, storeId, location));
        menu.setItems(itemsJson != null ? itemsJson : "[]");
        return repository.save(menu);
    }

    @Transactional(readOnly = true)
    public List<NavigationMenu> getAllMenus(UUID storeId) {
        UUID tenantId = TenantContext.require();
        return List.of(
            getMenu(storeId, "header"),
            getMenu(storeId, "footer")
        );
    }
}
