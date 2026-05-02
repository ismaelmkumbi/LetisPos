package io.smartpos.hrm.domain.repository;

import io.smartpos.hrm.domain.model.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AttendanceRepository extends JpaRepository<Attendance, UUID> {
    Optional<Attendance> findByEmployeeIdAndWorkDate(UUID employeeId, LocalDate workDate);
    List<Attendance> findByEmployeeIdAndWorkDateBetween(UUID employeeId, LocalDate from, LocalDate to);
    List<Attendance> findByWorkDateBetween(LocalDate from, LocalDate to);
}
