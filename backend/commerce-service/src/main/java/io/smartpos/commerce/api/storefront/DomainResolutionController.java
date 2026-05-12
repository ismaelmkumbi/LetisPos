package io.smartpos.commerce.api.storefront;

import io.smartpos.commerce.application.DomainService;
import io.smartpos.commerce.application.StoreService;
import io.smartpos.commerce.domain.model.CustomDomain;
import io.smartpos.commerce.domain.model.Store;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/storefront")
@RequiredArgsConstructor
public class DomainResolutionController {

    private final DomainService domainService;
    private final StoreService storeService;

    @GetMapping("/resolve")
    public ResponseEntity<Map<String, Object>> resolve(HttpServletRequest request) {
        String host = request.getHeader("Host");
        if (host == null || host.isBlank()) {
            throw new IllegalArgumentException("Host header is required");
        }
        // Strip port if present
        String domain = host.contains(":") ? host.substring(0, host.indexOf(":")) : host;
        CustomDomain cd = domainService.resolveByDomain(domain);
        Store store = storeService.getByTenant(cd.getTenantId());
        return ResponseEntity.ok(Map.of(
            "domain", cd.getDomain(),
            "storeId", store.getId(),
            "storeSlug", store.getSlug(),
            "storeName", store.getName(),
            "isVerified", cd.isVerified()
        ));
    }
}
