package io.smartpos.hrm.api;

import io.smartpos.hrm.api.dto.AttendanceDto;
import io.smartpos.hrm.application.AttendanceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/attendance")
@RequiredArgsConstructor
public class AttendanceController {

    private final AttendanceService service;

    @GetMapping("/by-employee/{employeeId}")
    @PreAuthorize("hasAuthority('hrm.view')")
    public List<AttendanceDto> forEmployee(
            @PathVariable UUID employeeId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return service.listForEmployee(employeeId, from, to);
    }

    @GetMapping
    @PreAuthorize("hasAuthority('hrm.view')")
    public List<AttendanceDto> byRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return service.listByDate(from, to);
    }

    @PostMapping("/check-in")
    @PreAuthorize("hasAuthority('hrm.attendance.write')")
    public AttendanceDto checkIn(@Valid @RequestBody AttendanceDto.CheckInRequest req) {
        return service.checkIn(req);
    }

    @PostMapping("/check-out")
    @PreAuthorize("hasAuthority('hrm.attendance.write')")
    public AttendanceDto checkOut(@Valid @RequestBody AttendanceDto.CheckOutRequest req) {
        return service.checkOut(req);
    }

    @PutMapping
    @PreAuthorize("hasAuthority('hrm.manage')")
    public AttendanceDto upsert(@Valid @RequestBody AttendanceDto.UpsertRequest req) {
        return service.upsert(req);
    }
}
