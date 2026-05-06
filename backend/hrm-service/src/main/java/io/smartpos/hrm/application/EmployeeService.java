package io.smartpos.hrm.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.hrm.api.dto.EmployeeDto;
import io.smartpos.hrm.domain.model.Employee;
import io.smartpos.hrm.domain.model.EmployeeStatus;
import io.smartpos.hrm.domain.repository.EmployeeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EmployeeService {

    private final EmployeeRepository repo;

    @Transactional(readOnly = true)
    public Page<EmployeeDto> search(String search, UUID departmentId, UUID designationId,
                                    EmployeeStatus status, Pageable pageable) {
        return repo.search(search, departmentId, designationId, status, TenantContext.require(), pageable).map(EmployeeDto::from);
    }

    @Transactional(readOnly = true)
    public EmployeeDto get(UUID id) {
        return repo.findById(id).map(EmployeeDto::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Employee not found"));
    }

    @Transactional
    public EmployeeDto create(EmployeeDto.CreateRequest req) {
        if (repo.existsByCodeIgnoreCase(req.code())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Employee code already exists");
        }
        Employee e = Employee.builder()
                .code(req.code()).userId(req.userId())
                .firstName(req.firstName()).lastName(req.lastName())
                .email(req.email()).phone(req.phone())
                .departmentId(req.departmentId()).designationId(req.designationId()).shiftId(req.shiftId())
                .hireDate(Optional.ofNullable(req.hireDate()).orElse(LocalDate.now()))
                .baseSalary(Optional.ofNullable(req.baseSalary()).orElse(BigDecimal.ZERO))
                .salaryCurrency(Optional.ofNullable(req.salaryCurrency()).orElse("TZS"))
                .address(req.address()).imageUrl(req.imageUrl()).notes(req.notes())
                .status(EmployeeStatus.ACTIVE)
                .tenantId(TenantContext.require())
                .build();
        return EmployeeDto.from(repo.save(e));
    }

    @Transactional
    public EmployeeDto update(UUID id, EmployeeDto.UpdateRequest req) {
        Employee e = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Employee not found"));
        if (req.firstName()      != null) e.setFirstName(req.firstName());
        if (req.lastName()       != null) e.setLastName(req.lastName());
        if (req.email()          != null) e.setEmail(req.email());
        if (req.phone()          != null) e.setPhone(req.phone());
        if (req.departmentId()   != null) e.setDepartmentId(req.departmentId());
        if (req.designationId()  != null) e.setDesignationId(req.designationId());
        if (req.shiftId()        != null) e.setShiftId(req.shiftId());
        if (req.hireDate()       != null) e.setHireDate(req.hireDate());
        if (req.endDate()        != null) e.setEndDate(req.endDate());
        if (req.baseSalary()     != null) e.setBaseSalary(req.baseSalary());
        if (req.salaryCurrency() != null) e.setSalaryCurrency(req.salaryCurrency());
        if (req.status()         != null) e.setStatus(req.status());
        if (req.address()        != null) e.setAddress(req.address());
        if (req.imageUrl()       != null) e.setImageUrl(req.imageUrl());
        if (req.notes()          != null) e.setNotes(req.notes());
        return EmployeeDto.from(repo.save(e));
    }

    @Transactional
    public void delete(UUID id) {
        Employee e = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Employee not found"));
        e.softDelete();
        repo.save(e);
    }
}
