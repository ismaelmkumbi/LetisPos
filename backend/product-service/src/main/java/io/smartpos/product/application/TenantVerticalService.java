package io.smartpos.product.application;

import io.smartpos.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;

/**
 * Manages which verticals are active for a given tenant.
 *
 * Queries the {@code tenant_verticals} table (created by V22 migration).
 * Results are not cached here — callers are expected to cache at the HTTP
 * or service level according to their freshness requirements.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TenantVerticalService {

    private final JdbcTemplate jdbc;

    /**
     * Return the set of vertical keys active for the given tenant.
     */
    public Set<String> getActiveVerticalKeys(UUID tenantId) {
        if (tenantId == null) return Set.of();

        List<String> keys = jdbc.queryForList(
                "SELECT vertical_key FROM tenant_verticals WHERE tenant_id = ?::uuid",
                String.class,
                tenantId.toString()
        );
        return new LinkedHashSet<>(keys);
    }

    /**
     * Return the set of vertical keys active for the current tenant (from TenantContext).
     */
    public Set<String> getActiveVerticalKeys() {
        return TenantContext.get()
                .map(this::getActiveVerticalKeys)
                .orElse(Set.of());
    }

    /**
     * Check whether a specific vertical is active for the given tenant.
     */
    public boolean isVerticalActive(UUID tenantId, String verticalKey) {
        if (tenantId == null || verticalKey == null) return false;
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM tenant_verticals WHERE tenant_id = ?::uuid AND vertical_key = ?",
                Integer.class,
                tenantId.toString(),
                verticalKey
        );
        return count != null && count > 0;
    }

    /**
     * Activate a vertical for the current tenant.
     * Returns true if inserted, false if already active.
     */
    public boolean activate(String verticalKey) {
        UUID tenantId = TenantContext.require();
        if (isVerticalActive(tenantId, verticalKey)) return false;

        jdbc.update(
                "INSERT INTO tenant_verticals (tenant_id, vertical_key, activated_at) VALUES (?::uuid, ?, ?)",
                tenantId.toString(),
                verticalKey,
                Timestamp.from(Instant.now())
        );
        log.info("Activated vertical '{}' for tenant {}", verticalKey, tenantId);
        return true;
    }

    /**
     * Deactivate a vertical for the current tenant.
     * Returns true if a row was deleted, false if it was already inactive.
     */
    public boolean deactivate(String verticalKey) {
        UUID tenantId = TenantContext.require();
        int deleted = jdbc.update(
                "DELETE FROM tenant_verticals WHERE tenant_id = ?::uuid AND vertical_key = ?",
                tenantId.toString(),
                verticalKey
        );
        if (deleted > 0) {
            log.info("Deactivated vertical '{}' for tenant {}", verticalKey, tenantId);
        }
        return deleted > 0;
    }

    /**
     * Returns all active verticals with their activation timestamps for the current tenant.
     */
    public List<Map<String, Object>> getActiveVerticalsWithMeta() {
        UUID tenantId = TenantContext.require();
        return jdbc.queryForList(
                "SELECT tv.vertical_key, tv.activated_at, vd.label, vd.description " +
                "FROM tenant_verticals tv " +
                "JOIN vertical_definitions vd ON vd.key = tv.vertical_key " +
                "WHERE tv.tenant_id = ?::uuid " +
                "ORDER BY vd.sort_order",
                tenantId.toString()
        );
    }
}
