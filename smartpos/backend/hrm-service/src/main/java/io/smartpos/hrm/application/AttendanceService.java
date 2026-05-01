package io.smartpos.hrm.application;

import io.smartpos.hrm.api.dto.AttendanceDto;
import io.smartpos.hrm.domain.model.Attendance;
import io.smartpos.hrm.domain.model.AttendanceStatus;
import io.smartpos.hrm.domain.repository.AttendanceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Attendance flow:
 *   POST /check-in   → upserts a row with check_in (status PRESENT)
 *   POST /check-out  → fills check_out + computes hours_worked
 *   PUT  /{id}       → manual edit (HR override)
 *
 * One row per (employee, date); the unique index enforces this.
 */
@Service
@RequiredArgsConstructor
public class AttendanceService {

    private final AttendanceRepository repo;

    @Transactional(readOnly = true)
    public List<AttendanceDto> listForEmployee(UUID employeeId, LocalDate from, LocalDate to) {
        return repo.findByEmployeeIdAndWorkDateBetween(employeeId, from, to)
                .stream().map(AttendanceDto::from).toList();
    }

    @Transactional(readOnly = true)
    public List<AttendanceDto> listByDate(LocalDate from, LocalDate to) {
        return repo.findByWorkDateBetween(from, to).stream().map(AttendanceDto::from).toList();
    }

    @Transactional
    public AttendanceDto checkIn(AttendanceDto.CheckInRequest req) {
        Instant when = Optional.ofNullable(req.timestamp()).orElseGet(Instant::now);
        LocalDate day = when.atZone(ZoneId.systemDefault()).toLocalDate();

        Attendance a = repo.findByEmployeeIdAndWorkDate(req.employeeId(), day)
                .orElseGet(() -> Attendance.builder()
                        .employeeId(req.employeeId())
                        .workDate(day)
                        .status(AttendanceStatus.PRESENT)
                        .build());
        if (a.getCheckIn() == null) a.setCheckIn(when);
        return AttendanceDto.from(repo.save(a));
    }

    @Transactional
    public AttendanceDto checkOut(AttendanceDto.CheckOutRequest req) {
        Instant when = Optional.ofNullable(req.timestamp()).orElseGet(Instant::now);
        LocalDate day = when.atZone(ZoneId.systemDefault()).toLocalDate();

        Attendance a = repo.findByEmployeeIdAndWorkDate(req.employeeId(), day)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No check-in for today"));
        a.setCheckOut(when);
        if (a.getCheckIn() != null) {
            long mins = Duration.between(a.getCheckIn(), when).toMinutes();
            a.setHoursWorked(BigDecimal.valueOf(mins).divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP));
        }
        return AttendanceDto.from(repo.save(a));
    }

    @Transactional
    public AttendanceDto upsert(AttendanceDto.UpsertRequest req) {
        Attendance a = repo.findByEmployeeIdAndWorkDate(req.employeeId(), req.workDate())
                .orElseGet(() -> Attendance.builder()
                        .employeeId(req.employeeId()).workDate(req.workDate()).build());
        if (req.checkIn()      != null) a.setCheckIn(req.checkIn());
        if (req.checkOut()     != null) a.setCheckOut(req.checkOut());
        if (req.status()       != null) a.setStatus(req.status());
        if (req.hoursWorked()  != null) a.setHoursWorked(req.hoursWorked());
        if (req.notes()        != null) a.setNotes(req.notes());
        return AttendanceDto.from(repo.save(a));
    }
}
