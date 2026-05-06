package io.smartpos.hrm.domain.repository;

import io.smartpos.hrm.domain.model.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AttendanceRepository extends JpaRepository<Attendance, UUID> {
    @Query("""
           SELECT a FROM Attendance a
           WHERE a.employeeId = :employeeId
             AND a.workDate   = :workDate
             AND a.tenantId   = :tenantId
           """)
    Optional<Attendance> findByEmployeeIdAndWorkDate(@Param("employeeId") UUID employeeId,
                                                     @Param("workDate") LocalDate workDate,
                                                     @Param("tenantId") UUID tenantId);

    @Query("""
           SELECT a FROM Attendance a
           WHERE a.employeeId = :employeeId
             AND a.workDate BETWEEN :from AND :to
             AND a.tenantId   = :tenantId
           """)
    List<Attendance> findByEmployeeIdAndWorkDateBetween(@Param("employeeId") UUID employeeId,
                                                        @Param("from") LocalDate from,
                                                        @Param("to") LocalDate to,
                                                        @Param("tenantId") UUID tenantId);

    @Query("""
           SELECT a FROM Attendance a
           WHERE a.workDate BETWEEN :from AND :to
             AND a.tenantId = :tenantId
           """)
    List<Attendance> findByWorkDateBetween(@Param("from") LocalDate from,
                                           @Param("to") LocalDate to,
                                           @Param("tenantId") UUID tenantId);
}
