package io.smartpos.sales.domain.repository;

import io.smartpos.sales.domain.model.IdempotencyKey;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IdempotencyRepository extends JpaRepository<IdempotencyKey, String> {
}
