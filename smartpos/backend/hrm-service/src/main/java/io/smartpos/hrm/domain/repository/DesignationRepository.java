package io.smartpos.hrm.domain.repository;

import io.smartpos.hrm.domain.model.Designation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DesignationRepository extends JpaRepository<Designation, UUID> {
    List<Designation> findByDepartmentId(UUID departmentId);
}
