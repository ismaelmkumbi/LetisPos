package io.smartpos.commerce.api.admin;

import io.smartpos.commerce.api.dto.admin.StoreDto;
import io.smartpos.commerce.api.dto.admin.UpdateStoreRequest;
import io.smartpos.commerce.application.StoreService;
import io.smartpos.commerce.domain.model.Store;
import io.smartpos.common.context.TenantContext;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/commerce")
@RequiredArgsConstructor
public class StoreSettingsController {

    private final StoreService storeService;

    @GetMapping("/settings")
    @PreAuthorize("hasAuthority('commerce.view')")
    public ResponseEntity<StoreDto> getSettings() {
        UUID tenantId = TenantContext.get().orElse(null);
        Store store = storeService.getByTenant(tenantId);
        return ResponseEntity.ok(StoreDto.from(store));
    }

    @PutMapping("/settings")
    @PreAuthorize("hasAuthority('commerce.settings')")
    public ResponseEntity<StoreDto> updateSettings(@Valid @RequestBody UpdateStoreRequest req) {
        UUID tenantId = TenantContext.require();
        Store updates = Store.builder()
            .name(req.name())
            .contactEmail(req.contactEmail()).contactPhone(req.contactPhone())
            .addressLine1(req.addressLine1()).addressLine2(req.addressLine2())
            .city(req.city()).state(req.state()).country(req.country())
            .postalCode(req.postalCode())
            .currency(req.currency()).timezone(req.timezone())
            .taxDisplay(req.taxDisplay())
            .socialFacebook(req.socialFacebook())
            .socialInstagram(req.socialInstagram())
            .socialTwitter(req.socialTwitter())
            .orderPrefix(req.orderPrefix())
            .build();
        Store updated = storeService.update(tenantId, updates);
        return ResponseEntity.ok(StoreDto.from(updated));
    }
}
