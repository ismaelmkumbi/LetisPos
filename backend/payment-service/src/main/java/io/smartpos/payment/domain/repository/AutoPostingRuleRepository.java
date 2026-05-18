package io.smartpos.payment.domain.repository;

import io.smartpos.payment.domain.model.AutoPostingRule;
import io.smartpos.payment.domain.model.ReferenceType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface AutoPostingRuleRepository extends JpaRepository<AutoPostingRule, UUID> {

    /**
     * Tenant-specific rules take priority over global defaults (tenant_id IS NULL).
     * Results are ordered so tenant-specific rows appear first.
     */
    @Query("""
        SELECT r FROM AutoPostingRule r
        WHERE r.referenceType = :referenceType
          AND (r.tenantId = :tenantId OR r.tenantId IS NULL)
        ORDER BY r.tenantId DESC NULLS LAST
        """)
    List<AutoPostingRule> findByReferenceTypeWithFallback(
            @Param("referenceType") ReferenceType referenceType,
            @Param("tenantId") UUID tenantId);
}
