package io.smartpos.hrm.domain.repository;

import io.smartpos.hrm.domain.model.Designation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface DesignationRepository extends JpaRepository<Designation, UUID> {
    @Query("""
           SELECT d FROM Designation d
           WHERE d.departmentId = :departmentId
             AND d.tenantId      = :tenantId
           """)
    List<Designation> findByDepartmentId(@Param("departmentId") UUID departmentId,
                                         @Param("tenantId") UUID tenantId);
}
