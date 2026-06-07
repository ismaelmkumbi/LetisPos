package io.smartpos.user.api;

import io.smartpos.user.application.MenuService;
import io.smartpos.user.application.MenuService.MenuNode;
import io.smartpos.user.application.MenuService.ReorderItem;
import io.smartpos.user.domain.model.MenuDefinition;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.*;

@RestController
@RequiredArgsConstructor
public class MenuController {

    private final MenuService menuService;

    @GetMapping("/api/v1/menu")
    public List<MenuNode> getMyMenu(Authentication auth) {
        Set<String> features = extractFeatures(auth);
        Set<String> roles = extractRoles(auth);
        boolean isSuperAdmin = auth != null && auth.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_SUPER_ADMIN"));
        return menuService.getFilteredTree(features, roles, isSuperAdmin);
    }

    @GetMapping("/api/v1/admin/menu")
    @PreAuthorize("hasAuthority('admin')")
    public List<MenuDefinition> getFullMenu() {
        return menuService.getFullTree();
    }

    @PostMapping("/api/v1/admin/menu")
    @PreAuthorize("hasAuthority('admin')")
    public ResponseEntity<MenuDefinition> createMenu(@Valid @RequestBody CreateMenuRequest body) {
        MenuDefinition item = MenuDefinition.builder()
            .key(body.key())
            .label(body.label())
            .icon(body.icon())
            .route(body.route())
            .requiredFeatureKey(body.requiredFeatureKey())
            .sortOrder(body.sortOrder())
            .sectionHeader(body.sectionHeader())
            .build();
        if (body.parentId() != null) {
            MenuDefinition parent = new MenuDefinition();
            parent.setId(body.parentId());
            item.setParent(parent);
        }
        MenuDefinition saved = menuService.createMenuItem(item);
        menuService.evictMenuCache();
        return ResponseEntity.created(URI.create("/api/v1/admin/menu/" + saved.getId())).body(saved);
    }

    @PutMapping("/api/v1/admin/menu/{id}")
    @PreAuthorize("hasAuthority('admin')")
    public MenuDefinition updateMenu(@PathVariable UUID id, @Valid @RequestBody UpdateMenuRequest body) {
        MenuDefinition updated = MenuDefinition.builder()
            .label(body.label())
            .icon(body.icon())
            .route(body.route())
            .requiredFeatureKey(body.requiredFeatureKey())
            .sortOrder(body.sortOrder())
            .visible(body.visible())
            .sectionHeader(body.sectionHeader())
            .build();
        if (body.parentId() != null) {
            MenuDefinition parent = new MenuDefinition();
            parent.setId(body.parentId());
            updated.setParent(parent);
        }
        MenuDefinition saved = menuService.updateMenuItem(id, updated);
        menuService.evictMenuCache();
        return saved;
    }

    @DeleteMapping("/api/v1/admin/menu/{id}")
    @PreAuthorize("hasAuthority('admin')")
    public ResponseEntity<Void> deleteMenu(@PathVariable UUID id) {
        menuService.deleteMenuItem(id);
        menuService.evictMenuCache();
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/api/v1/admin/menu/reorder")
    @PreAuthorize("hasAuthority('admin')")
    public ResponseEntity<Void> reorderMenu(@Valid @RequestBody List<ReorderItem> items) {
        menuService.reorder(items);
        return ResponseEntity.ok().build();
    }

    @SuppressWarnings("unchecked")
    private Set<String> extractFeatures(Authentication auth) {
        if (auth == null) return Set.of();
        try {
            if (auth instanceof org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken jwtAuth) {
                Object featuresObj = jwtAuth.getToken().getClaims().get("features");
                if (featuresObj instanceof List<?> list) {
                    return new HashSet<>((List<String>) list);
                }
            }
        } catch (Exception e) {
            // Fall through to empty
        }
        return Set.of();
    }

    @SuppressWarnings("unchecked")
    private Set<String> extractRoles(Authentication auth) {
        if (auth == null) return Set.of();
        try {
            if (auth instanceof org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken jwtAuth) {
                Object rolesObj = jwtAuth.getToken().getClaims().get("roles");
                if (rolesObj instanceof List<?> list) {
                    return new HashSet<>((List<String>) list);
                }
            }
        } catch (Exception e) {
            // Fall through to empty
        }
        return Set.of();
    }

    public record CreateMenuRequest(@NotBlank String key, @NotBlank String label,
                                     String icon, String route, String requiredFeatureKey,
                                     int sortOrder, boolean sectionHeader, UUID parentId) {}
    public record UpdateMenuRequest(@NotBlank String label, String icon, String route,
                                     String requiredFeatureKey, int sortOrder,
                                     boolean visible, boolean sectionHeader, UUID parentId) {}
}
