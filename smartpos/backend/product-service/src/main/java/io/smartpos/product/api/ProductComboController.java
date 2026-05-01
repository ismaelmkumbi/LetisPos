package io.smartpos.product.api;

import io.smartpos.product.api.dto.ComboItemDto;
import io.smartpos.product.api.dto.CreateProductRequest.ComboItemInput;
import io.smartpos.product.application.ProductComboService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/products/{productId}/combo-items")
@RequiredArgsConstructor
public class ProductComboController {

    private final ProductComboService service;

    @GetMapping
    @PreAuthorize("hasAuthority('product.view')")
    public List<ComboItemDto> list(@PathVariable UUID productId) {
        return service.list(productId);
    }

    /** Replace the full bundle composition in one PUT (typical UX). */
    @PutMapping
    @PreAuthorize("hasAuthority('product.update')")
    public List<ComboItemDto> replace(@PathVariable UUID productId,
                                      @RequestBody @Valid List<ComboItemInput> items) {
        return service.replace(productId, items);
    }
}
