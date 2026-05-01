package io.smartpos.hrm.domain.repository;

import io.smartpos.hrm.domain.model.LeaveType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface LeaveTypeRepository extends JpaRepository<LeaveType, UUID> {}
