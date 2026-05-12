package io.smartpos.commerce.api.admin;

import io.smartpos.commerce.api.dto.admin.CategoryDisplayDto;
import io.smartpos.commerce.application.CategoryDisplayService;
import io.smartpos.commerce.application.StoreService;
import io.smartpos.commerce.domain.model.CategoryDisplay;
import io.smartpos.commerce.domain.model.Store;
import io.smartpos.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/commerce/categories")
@RequiredArgsConstructor
public class CategoryDisplayController {

    private final CategoryDisplayService service;
    private final StoreService storeService;

    @GetMapping
    @PreAuthorize("hasAuthority('commerce.products')")
    public List<CategoryDisplayDto> list() {
        UUID tenantId = TenantContext.require();
        Store store = storeService.getByTenant(tenantId);
        return service.list(store.getId()).stream()
            .map(CategoryDisplayDto::from)
            .toList();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('commerce.products')")
    public ResponseEntity<CategoryDisplayDto> add(@RequestBody CategoryDisplay cd) {
        UUID tenantId = TenantContext.require();
        Store store = storeService.getByTenant(tenantId);
        CategoryDisplay created = service.add(store.getId(), cd);
        return ResponseEntity.status(HttpStatus.CREATED).body(CategoryDisplayDto.from(created));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('commerce.products')")
    public CategoryDisplayDto update(@PathVariable UUID id, @RequestBody CategoryDisplay updates) {
        CategoryDisplay updated = service.update(id, updates);
        return CategoryDisplayDto.from(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('commerce.products')")
    public ResponseEntity<Void> remove(@PathVariable UUID id) {
        service.remove(id);
        return ResponseEntity.noContent().build();
    }
}
