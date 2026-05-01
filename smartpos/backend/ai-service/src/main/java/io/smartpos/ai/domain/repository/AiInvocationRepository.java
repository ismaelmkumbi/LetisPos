package io.smartpos.ai.domain.repository;

import io.smartpos.ai.domain.model.AiInvocation;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface AiInvocationRepository extends JpaRepository<AiInvocation, UUID> {
    Page<AiInvocation> findByKindOrderByCreatedAtDesc(String kind, Pageable pageable);
}
