package io.smartpos.common.context;

import java.util.Optional;
import java.util.UUID;

/**
 * Request-scoped holder for the current tenant ID.
 *
 * Populated by {@link TenantContextFilter} from either:
 *  - the signed {@code tenantId} claim from the JWT, or
 *  - the {@code X-Tenant-ID} header injected by trusted internal callers.
 */
public final class TenantContext {

    private static final ThreadLocal<UUID> CURRENT = new ThreadLocal<>();

    private TenantContext() {}

    public static void set(UUID tenantId) {
        CURRENT.set(tenantId);
    }

    public static Optional<UUID> get() {
        return Optional.ofNullable(CURRENT.get());
    }

    /**
     * Returns the tenant ID or throws — use for data-access paths where
     * tenant scoping is mandatory.
     */
    public static UUID require() {
        UUID id = CURRENT.get();
        if (id == null) {
            throw new TenantNotInContextException();
        }
        return id;
    }

    public static void clear() {
        CURRENT.remove();
    }
}
