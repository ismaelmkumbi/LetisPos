package io.smartpos.hrm.api;

import io.smartpos.hrm.api.dto.OrgDtos.*;
import io.smartpos.hrm.application.OrgService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/hrm")
@RequiredArgsConstructor
public class OrgController {

    private final OrgService service;

    // ----- departments -----
    @GetMapping("/departments")
    @PreAuthorize("hasAuthority('hrm.view')")
    public List<DepartmentDto> departments() { return service.listDepartments(); }

    @PostMapping("/departments")
    @PreAuthorize("hasAuthority('hrm.manage')")
    @ResponseStatus(HttpStatus.CREATED)
    public DepartmentDto createDept(@Valid @RequestBody DepartmentDto.CreateRequest req) {
        return service.createDepartment(req);
    }

    @DeleteMapping("/departments/{id}")
    @PreAuthorize("hasAuthority('hrm.manage')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDept(@PathVariable UUID id) { service.deleteDepartment(id); }

    // ----- designations -----
    @GetMapping("/designations")
    @PreAuthorize("hasAuthority('hrm.view')")
    public List<DesignationDto> designations(@RequestParam(required = false) UUID departmentId) {
        return service.listDesignations(departmentId);
    }

    @PostMapping("/designations")
    @PreAuthorize("hasAuthority('hrm.manage')")
    @ResponseStatus(HttpStatus.CREATED)
    public DesignationDto createDesignation(@Valid @RequestBody DesignationDto.CreateRequest req) {
        return service.createDesignation(req);
    }

    @DeleteMapping("/designations/{id}")
    @PreAuthorize("hasAuthority('hrm.manage')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDesignation(@PathVariable UUID id) { service.deleteDesignation(id); }

    // ----- shifts -----
    @GetMapping("/shifts")
    @PreAuthorize("hasAuthority('hrm.view')")
    public List<ShiftDto> shifts() { return service.listShifts(); }

    @PostMapping("/shifts")
    @PreAuthorize("hasAuthority('hrm.manage')")
    @ResponseStatus(HttpStatus.CREATED)
    public ShiftDto createShift(@Valid @RequestBody ShiftDto.CreateRequest req) {
        return service.createShift(req);
    }

    @DeleteMapping("/shifts/{id}")
    @PreAuthorize("hasAuthority('hrm.manage')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteShift(@PathVariable UUID id) { service.deleteShift(id); }

    // ----- holidays -----
    @GetMapping("/holidays")
    @PreAuthorize("hasAuthority('hrm.view')")
    public List<HolidayDto> holidays(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return service.listHolidays(from, to);
    }

    @PostMapping("/holidays")
    @PreAuthorize("hasAuthority('hrm.manage')")
    @ResponseStatus(HttpStatus.CREATED)
    public HolidayDto createHoliday(@Valid @RequestBody HolidayDto.CreateRequest req) {
        return service.createHoliday(req);
    }

    @DeleteMapping("/holidays/{id}")
    @PreAuthorize("hasAuthority('hrm.manage')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteHoliday(@PathVariable UUID id) { service.deleteHoliday(id); }

    // ----- leave types -----
    @GetMapping("/leave-types")
    @PreAuthorize("hasAuthority('hrm.view')")
    public List<LeaveTypeDto> leaveTypes() { return service.listLeaveTypes(); }

    @PostMapping("/leave-types")
    @PreAuthorize("hasAuthority('hrm.manage')")
    @ResponseStatus(HttpStatus.CREATED)
    public LeaveTypeDto createLeaveType(@Valid @RequestBody LeaveTypeDto.CreateRequest req) {
        return service.createLeaveType(req);
    }

    @DeleteMapping("/leave-types/{id}")
    @PreAuthorize("hasAuthority('hrm.manage')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteLeaveType(@PathVariable UUID id) { service.deleteLeaveType(id); }
}
