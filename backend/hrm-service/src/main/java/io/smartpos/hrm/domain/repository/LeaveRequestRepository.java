package io.smartpos.hrm.domain.repository;

import io.smartpos.hrm.domain.model.LeaveRequest;
import io.smartpos.hrm.domain.model.LeaveStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, UUID> {
    @Query("""
           SELECT lr FROM LeaveRequest lr
           WHERE lr.employeeId = :employeeId
             AND lr.tenantId   = :tenantId
           ORDER BY lr.createdAt DESC
           """)
    Page<LeaveRequest> findByEmployeeIdOrderByCreatedAtDesc(@Param("employeeId") UUID employeeId,
                                                            @Param("tenantId") UUID tenantId,
                                                            Pageable pageable);

    @Query("""
           SELECT lr FROM LeaveRequest lr
           WHERE lr.status   = :status
             AND lr.tenantId = :tenantId
           """)
    List<LeaveRequest> findByStatus(@Param("status") LeaveStatus status,
                                    @Param("tenantId") UUID tenantId);
}
