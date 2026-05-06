package io.smartpos.hrm.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.hrm.api.dto.OrgDtos.*;
import io.smartpos.hrm.domain.model.*;
import io.smartpos.hrm.domain.repository.DepartmentRepository;
import io.smartpos.hrm.domain.repository.DesignationRepository;
import io.smartpos.hrm.domain.repository.HolidayRepository;
import io.smartpos.hrm.domain.repository.LeaveTypeRepository;
import io.smartpos.hrm.domain.repository.OfficeShiftRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * One service to host all simple org-structure CRUD (departments, designations,
 * shifts, holidays, leave types). They share the same shape: list / get /
 * create / delete — no point in five near-identical files.
 */
@Service
@RequiredArgsConstructor
public class OrgService {

    private final DepartmentRepository  deptRepo;
    private final DesignationRepository desigRepo;
    private final OfficeShiftRepository shiftRepo;
    private final HolidayRepository     holidayRepo;
    private final LeaveTypeRepository   leaveTypeRepo;

    // -------- departments --------
    @Transactional(readOnly = true)
    public List<DepartmentDto> listDepartments() {
        return deptRepo.findAll().stream().map(DepartmentDto::from).toList();
    }
    @Transactional
    public DepartmentDto createDepartment(DepartmentDto.CreateRequest req) {
        if (deptRepo.existsByNameIgnoreCase(req.name())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Department exists");
        }
        return DepartmentDto.from(deptRepo.save(Department.builder()
                .name(req.name()).description(req.description())
                .tenantId(TenantContext.require()).build()));
    }
    @Transactional
    public void deleteDepartment(UUID id) { deptRepo.deleteById(id); }

    // -------- designations --------
    @Transactional(readOnly = true)
    public List<DesignationDto> listDesignations(UUID departmentId) {
        return (departmentId == null ? desigRepo.findAll() : desigRepo.findByDepartmentId(departmentId, TenantContext.require()))
                .stream().map(DesignationDto::from).toList();
    }
    @Transactional
    public DesignationDto createDesignation(DesignationDto.CreateRequest req) {
        return DesignationDto.from(desigRepo.save(Designation.builder()
                .name(req.name()).departmentId(req.departmentId())
                .description(req.description()).tenantId(TenantContext.require()).build()));
    }
    @Transactional
    public void deleteDesignation(UUID id) { desigRepo.deleteById(id); }

    // -------- shifts --------
    @Transactional(readOnly = true)
    public List<ShiftDto> listShifts() {
        return shiftRepo.findAll().stream().map(ShiftDto::from).toList();
    }
    @Transactional
    public ShiftDto createShift(ShiftDto.CreateRequest req) {
        return ShiftDto.from(shiftRepo.save(OfficeShift.builder()
                .name(req.name()).startTime(req.startTime()).endTime(req.endTime())
                .tenantId(TenantContext.require()).build()));
    }
    @Transactional
    public void deleteShift(UUID id) { shiftRepo.deleteById(id); }

    // -------- holidays --------
    @Transactional(readOnly = true)
    public List<HolidayDto> listHolidays(LocalDate from, LocalDate to) {
        if (from != null && to != null) {
            return holidayRepo.findByHolidayDateBetween(from, to, TenantContext.require())
                    .stream().map(HolidayDto::from).toList();
        }
        return holidayRepo.findAll().stream().map(HolidayDto::from).toList();
    }
    @Transactional
    public HolidayDto createHoliday(HolidayDto.CreateRequest req) {
        return HolidayDto.from(holidayRepo.save(Holiday.builder()
                .name(req.name()).holidayDate(req.holidayDate()).description(req.description())
                .tenantId(TenantContext.require()).build()));
    }
    @Transactional
    public void deleteHoliday(UUID id) { holidayRepo.deleteById(id); }

    // -------- leave types --------
    @Transactional(readOnly = true)
    public List<LeaveTypeDto> listLeaveTypes() {
        return leaveTypeRepo.findAll().stream().map(LeaveTypeDto::from).toList();
    }
    @Transactional
    public LeaveTypeDto createLeaveType(LeaveTypeDto.CreateRequest req) {
        return LeaveTypeDto.from(leaveTypeRepo.save(LeaveType.builder()
                .name(req.name()).daysPerYear(req.daysPerYear())
                .paid(req.paid() == null || req.paid())
                .tenantId(TenantContext.require()).build()));
    }
    @Transactional
    public void deleteLeaveType(UUID id) { leaveTypeRepo.deleteById(id); }
}
