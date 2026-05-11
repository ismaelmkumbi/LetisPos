package io.smartpos.billing.infrastructure.security;

import io.smartpos.common.context.TenantContext;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * SpEL-accessible bean that verifies the current JWT bearer owns
 * the tenant resource they are trying to access.
 */
@Component("tenantOwnershipCheck")
public class TenantOwnershipCheck {

    /**
     * Returns true when the tenant ID in the request path matches the
     * {@code tenantId} claim in the current JWT (or the X-Tenant-ID
     * header for internal calls).
     */
    public boolean isCurrentTenant(UUID tenantId) {
        if (tenantId == null) return false;
        return TenantContext.get()
                .map(tenantId::equals)
                .orElse(false);
    }
}
