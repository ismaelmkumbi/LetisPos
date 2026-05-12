package io.smartpos.commerce.api.admin;

import io.smartpos.commerce.application.PageService;
import io.smartpos.commerce.application.StoreService;
import io.smartpos.commerce.domain.model.Store;
import io.smartpos.commerce.domain.model.StorePage;
import io.smartpos.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/commerce/pages")
@RequiredArgsConstructor
public class PageController {

    private final PageService pageService;
    private final StoreService storeService;

    @GetMapping
    @PreAuthorize("hasAuthority('commerce.pages')")
    public List<StorePage> list() {
        Store store = storeService.getByTenant(TenantContext.require());
        return pageService.listByStore(store.getId());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('commerce.pages')")
    public StorePage getById(@PathVariable UUID id) {
        Store store = storeService.getByTenant(TenantContext.require());
        return pageService.listByStore(store.getId()).stream()
            .filter(p -> p.getId().equals(id))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Page not found"));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('commerce.pages')")
    public ResponseEntity<StorePage> create(@RequestBody StorePage page) {
        Store store = storeService.getByTenant(TenantContext.require());
        StorePage created = pageService.create(store.getId(), page);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('commerce.pages')")
    public StorePage update(@PathVariable UUID id, @RequestBody StorePage updates) {
        return pageService.update(id, updates);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('commerce.pages')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        pageService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
