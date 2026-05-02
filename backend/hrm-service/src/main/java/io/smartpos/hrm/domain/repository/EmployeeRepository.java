package io.smartpos.hrm.domain.repository;

import io.smartpos.hrm.domain.model.Employee;
import io.smartpos.hrm.domain.model.EmployeeStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface EmployeeRepository extends JpaRepository<Employee, UUID> {
    Optional<Employee> findByCodeIgnoreCase(String code);
    boolean existsByCodeIgnoreCase(String code);

    @Query("""
           SELECT e FROM Employee e
           WHERE (COALESCE(:search,'') = '' OR LOWER(e.firstName) LIKE LOWER(CONCAT('%', :search, '%'))
                                            OR LOWER(e.lastName)  LIKE LOWER(CONCAT('%', :search, '%'))
                                            OR LOWER(e.code)      LIKE LOWER(CONCAT('%', :search, '%')))
             AND (:departmentId  IS NULL OR e.departmentId  = :departmentId)
             AND (:designationId IS NULL OR e.designationId = :designationId)
             AND (:status        IS NULL OR e.status        = :status)
           """)
    Page<Employee> search(@Param("search") String search,
                          @Param("departmentId")  UUID departmentId,
                          @Param("designationId") UUID designationId,
                          @Param("status")        EmployeeStatus status,
                          Pageable pageable);
}
