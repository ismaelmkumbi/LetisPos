package io.smartpos.hrm.domain.repository;

import io.smartpos.hrm.domain.model.LeaveRequest;
import io.smartpos.hrm.domain.model.LeaveStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, UUID> {
    Page<LeaveRequest> findByEmployeeIdOrderByCreatedAtDesc(UUID employeeId, Pageable pageable);
    List<LeaveRequest> findByStatus(LeaveStatus status);
}
