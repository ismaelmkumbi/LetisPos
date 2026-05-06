package io.smartpos.ai.domain.repository;

import io.smartpos.ai.domain.model.AiInvocation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.UUID;

public interface AiInvocationRepository extends JpaRepository<AiInvocation, UUID> {
    @Query("SELECT a FROM AiInvocation a WHERE a.kind = :kind AND a.tenantId = :tenantId ORDER BY a.createdAt DESC")
    Page<AiInvocation> findByKindOrderByCreatedAtDesc(@Param("kind") String kind,
                                                       @Param("tenantId") UUID tenantId,
                                                       Pageable pageable);
}
