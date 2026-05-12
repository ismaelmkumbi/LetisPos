package io.smartpos.commerce.api.admin;

import io.smartpos.commerce.application.DomainService;
import io.smartpos.commerce.application.StoreService;
import io.smartpos.commerce.domain.model.CustomDomain;
import io.smartpos.commerce.domain.model.Store;
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
@RequestMapping("/api/v1/commerce/domains")
@RequiredArgsConstructor
public class DomainController {

    private final DomainService domainService;
    private final StoreService storeService;

    @GetMapping
    @PreAuthorize("hasAuthority('commerce.domains')")
    public List<CustomDomain> list() {
        Store store = storeService.getByTenant(TenantContext.require());
        return domainService.listDomains(store.getId());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('commerce.domains')")
    public ResponseEntity<CustomDomain> add(@RequestBody Map<String, String> body) {
        Store store = storeService.getByTenant(TenantContext.require());
        String domain = body.get("domain");
        if (domain == null || domain.isBlank()) {
            throw new IllegalArgumentException("Domain is required");
        }
        CustomDomain created = domainService.addDomain(store.getId(), domain);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PostMapping("/{id}/verify")
    @PreAuthorize("hasAuthority('commerce.domains')")
    public ResponseEntity<CustomDomain> verify(@PathVariable UUID id) {
        CustomDomain verified = domainService.verifyDomain(id);
        return ResponseEntity.ok(verified);
    }

    @GetMapping("/{id}/status")
    @PreAuthorize("hasAuthority('commerce.domains')")
    public ResponseEntity<CustomDomain> status(@PathVariable UUID id) {
        CustomDomain domain = domainService.getStatus(id);
        return ResponseEntity.ok(domain);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('commerce.domains')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        domainService.deleteDomain(id);
        return ResponseEntity.noContent().build();
    }
}
