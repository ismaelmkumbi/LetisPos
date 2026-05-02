package io.smartpos.hrm.domain.repository;

import io.smartpos.hrm.domain.model.OfficeShift;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface OfficeShiftRepository extends JpaRepository<OfficeShift, UUID> {}
