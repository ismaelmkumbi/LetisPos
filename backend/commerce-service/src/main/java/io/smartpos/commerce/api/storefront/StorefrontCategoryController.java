package io.smartpos.commerce.api.storefront;

import io.smartpos.commerce.api.dto.admin.CategoryDisplayDto;
import io.smartpos.commerce.application.CategoryDisplayService;
import io.smartpos.commerce.application.StoreService;
import io.smartpos.common.context.TenantContext;
import io.smartpos.commerce.domain.model.Store;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/storefront/{slug}/categories")
@RequiredArgsConstructor
public class StorefrontCategoryController {

    private final StoreService storeService;
    private final CategoryDisplayService service;

    @GetMapping
    public List<CategoryDisplayDto> listVisible(@PathVariable String slug) {
        Store store = storeService.getBySlug(slug);
        TenantContext.set(store.getTenantId());
        return service.listVisible(store.getId()).stream()
            .map(CategoryDisplayDto::from)
            .toList();
    }
}
