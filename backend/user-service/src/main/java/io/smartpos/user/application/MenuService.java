package io.smartpos.user.application;

import io.smartpos.user.domain.model.MenuDefinition;
import io.smartpos.user.domain.model.MenuDefinitionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class MenuService {

    private final MenuDefinitionRepository menuRepository;

    /**
     * Role hierarchy for menu gating — higher number = more privileged.
     * Used as a safety-net filter for menu items that have no requiredFeatureKey.
     */
    private static final Map<String, Integer> ROLE_LEVEL = Map.of(
        "SUPER_ADMIN", 5,
        "TENANT_ADMIN", 4,
        "OWNER", 3,
        "MANAGER", 2,
        "CASHIER", 1
    );

    /**
     * Menu item routes that require a minimum role level.
     * Maps route prefix → minimum role level.
     * <p>
     * ORDER MATTERS: more-specific platform routes (level 5) must appear
     * BEFORE the broader /smartpos/admin prefix (level 4) so they are
     * checked first in the linear scan inside {@link #filterNode}.
     */
    private static final Map<String, Integer> ROUTE_MIN_LEVEL = Map.ofEntries(
        // ── Platform-only routes (SUPER_ADMIN, level 5) ──
        Map.entry("/smartpos/admin/tenants", 5),
        Map.entry("/smartpos/admin/platform-settings", 5),
        Map.entry("/smartpos/admin/features", 5),
        Map.entry("/smartpos/admin/sessions", 5),
        Map.entry("/smartpos/admin/api-keys", 5),
        Map.entry("/smartpos/admin/audit-logs", 5),
        Map.entry("/smartpos/admin/error-logs", 5),
        Map.entry("/smartpos/admin/data-retention", 5),
        Map.entry("/smartpos/admin/backups", 5),
        Map.entry("/smartpos/admin/troubleshooting", 5),
        // ── Tenant admin routes (TENANT_ADMIN+, level 4) ──
        Map.entry("/smartpos/admin", 4),
        Map.entry("/smartpos/settings", 4),
        Map.entry("/smartpos/integrations", 4),
        // ── Manager routes (MANAGER+, level 2) ──
        Map.entry("/smartpos/hrm", 2),
        Map.entry("/smartpos/reports/financial", 2),
        Map.entry("/smartpos/reports/employees", 2),
        Map.entry("/smartpos/reports/profit-loss", 2),
        Map.entry("/smartpos/crm", 2),
        Map.entry("/smartpos/ai", 2),
        Map.entry("/smartpos/marketing", 2),
        Map.entry("/smartpos/accounting", 2)
    );

    @Cacheable(value = "menu:full-tree")
    public List<MenuDefinition> getFullTree() {
        return menuRepository.findFullTree();
    }

    public List<MenuNode> getFilteredTree(Set<String> userFeatures, Set<String> userRoles, boolean isSuperAdmin) {
        List<MenuDefinition> fullTree = getFullTree();
        int maxRoleLevel = getMaxRoleLevel(userRoles, isSuperAdmin);
        return fullTree.stream()
            .map(item -> filterNode(item, userFeatures, isSuperAdmin, maxRoleLevel))
            .filter(Objects::nonNull)
            .toList();
    }

    // Backward-compatible overload for callers that don't have roles
    public List<MenuNode> getFilteredTree(Set<String> userFeatures, boolean isSuperAdmin) {
        return getFilteredTree(userFeatures, Set.of(), isSuperAdmin);
    }

    private int getMaxRoleLevel(Set<String> roles, boolean isSuperAdmin) {
        if (isSuperAdmin) return 5;
        return roles.stream()
            .map(r -> ROLE_LEVEL.getOrDefault(r, 1))
            .max(Integer::compareTo)
            .orElse(1);
    }

    private MenuNode filterNode(MenuDefinition item, Set<String> userFeatures,
                                 boolean isSuperAdmin, int maxRoleLevel) {
        if (isSuperAdmin) {
            return MenuNode.from(item, filterChildren(item, userFeatures, true, maxRoleLevel));
        }

        String required = item.getRequiredFeatureKey();
        if (required != null && !userFeatures.contains(required)) {
            return null;
        }

        // Safety-net: filter menu items whose route requires a higher role than
        // the user has. This runs AFTER the feature check so a user who has the
        // admin feature via ENTERPRISE but is only a CASHIER still can't see
        // platform routes like Tenants, Platform Settings, Feature Manager, etc.
        String route = item.getRoute();
        if (route != null) {
            for (var entry : ROUTE_MIN_LEVEL.entrySet()) {
                if (route.startsWith(entry.getKey()) && maxRoleLevel < entry.getValue()) {
                    return null;
                }
            }
        }

        List<MenuNode> filteredChildren = filterChildren(item, userFeatures, false, maxRoleLevel);
        if (item.isSectionHeader() && filteredChildren.isEmpty()) {
            return null;
        }

        return MenuNode.from(item, filteredChildren);
    }

    private List<MenuNode> filterChildren(MenuDefinition item, Set<String> userFeatures,
                                           boolean isSuperAdmin, int maxRoleLevel) {
        return item.getChildren().stream()
            .map(child -> filterNode(child, userFeatures, isSuperAdmin, maxRoleLevel))
            .filter(Objects::nonNull)
            .toList();
    }

    @CacheEvict(value = "menu:full-tree", allEntries = true)
    public void evictMenuCache() {}

    @Transactional
    public MenuDefinition createMenuItem(MenuDefinition item) {
        return menuRepository.save(item);
    }

    @Transactional
    public MenuDefinition updateMenuItem(UUID id, MenuDefinition updated) {
        MenuDefinition existing = menuRepository.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Menu item not found: " + id));
        existing.setLabel(updated.getLabel());
        existing.setIcon(updated.getIcon());
        existing.setRoute(updated.getRoute());
        existing.setRequiredFeatureKey(updated.getRequiredFeatureKey());
        existing.setSortOrder(updated.getSortOrder());
        existing.setVisible(updated.isVisible());
        existing.setSectionHeader(updated.isSectionHeader());
        if (updated.getParent() != null) {
            existing.setParent(updated.getParent());
        }
        return menuRepository.save(existing);
    }

    @Transactional
    public void deleteMenuItem(UUID id) {
        menuRepository.deleteById(id);
    }

    @Transactional
    public void reorder(List<ReorderItem> items) {
        for (ReorderItem item : items) {
            MenuDefinition menu = menuRepository.findById(item.id())
                .orElseThrow(() -> new NoSuchElementException("Menu item not found: " + item.id()));
            menu.setSortOrder(item.sortOrder());
            if (item.parentId() != null) {
                MenuDefinition parent = menuRepository.findById(item.parentId())
                    .orElseThrow(() -> new NoSuchElementException("Parent not found: " + item.parentId()));
                menu.setParent(parent);
            } else {
                menu.setParent(null);
            }
            menuRepository.save(menu);
        }
        evictMenuCache();
    }

    public record MenuNode(UUID id, String key, String label, String icon, String route,
                           boolean sectionHeader, List<MenuNode> children) {
        public static MenuNode from(MenuDefinition item, List<MenuNode> children) {
            return new MenuNode(item.getId(), item.getKey(), item.getLabel(), item.getIcon(),
                item.getRoute(), item.isSectionHeader(), children);
        }
    }

    public record ReorderItem(UUID id, UUID parentId, int sortOrder) {}
}
