package io.smartpos.common.context;

/**
 * Thrown when {@link TenantContext#require()} is called but no tenant
 * is present in the current request context.
 */
public class TenantNotInContextException extends IllegalStateException {

    public TenantNotInContextException() {
        super("No tenant in context — request is not tenant-scoped");
    }
}
