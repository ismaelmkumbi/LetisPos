package io.smartpos.hrm.domain.repository;

import io.smartpos.hrm.domain.model.PayrollRun;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PayrollRunRepository extends JpaRepository<PayrollRun, UUID> {
    boolean existsByRefIgnoreCase(String ref);
}
