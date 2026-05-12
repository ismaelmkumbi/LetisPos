package io.smartpos.commerce.api.storefront;

import io.smartpos.commerce.application.PageService;
import io.smartpos.commerce.application.StoreService;
import io.smartpos.commerce.domain.model.Store;
import io.smartpos.commerce.domain.model.StorePage;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/storefront/{slug}")
@RequiredArgsConstructor
public class StorefrontPageController {

    private final StoreService storeService;
    private final PageService pageService;

    @GetMapping("/pages/{key}")
    public StorePage getPage(@PathVariable String slug, @PathVariable String key) {
        Store store = storeService.getBySlug(slug);
        return pageService.getByKey(store.getId(), key);
    }
}
