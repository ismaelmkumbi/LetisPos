package io.smartpos.hrm.api.dto;

import io.smartpos.hrm.domain.model.Employee;
import io.smartpos.hrm.domain.model.EmployeeStatus;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record EmployeeDto(
        UUID id, String code, UUID userId,
        String firstName, String lastName, String email, String phone,
        UUID departmentId, UUID designationId, UUID shiftId,
        LocalDate hireDate, LocalDate endDate,
        BigDecimal baseSalary, String salaryCurrency,
        EmployeeStatus status,
        String address, String imageUrl, String notes
) {
    public static EmployeeDto from(Employee e) {
        return new EmployeeDto(
                e.getId(), e.getCode(), e.getUserId(),
                e.getFirstName(), e.getLastName(), e.getEmail(), e.getPhone(),
                e.getDepartmentId(), e.getDesignationId(), e.getShiftId(),
                e.getHireDate(), e.getEndDate(),
                e.getBaseSalary(), e.getSalaryCurrency(),
                e.getStatus(), e.getAddress(), e.getImageUrl(), e.getNotes());
    }

    public record CreateRequest(
            @NotBlank @Size(max=50)  String code,
            UUID userId,
            @NotBlank @Size(max=120) String firstName,
            @Size(max=120) String lastName,
            @Email String email,
            String phone,
            UUID departmentId, UUID designationId, UUID shiftId,
            LocalDate hireDate,
            @DecimalMin("0.0") BigDecimal baseSalary,
            String salaryCurrency,
            String address, String imageUrl, String notes
    ) {}

    public record UpdateRequest(
            String firstName, String lastName, String email, String phone,
            UUID departmentId, UUID designationId, UUID shiftId,
            LocalDate hireDate, LocalDate endDate,
            BigDecimal baseSalary, String salaryCurrency,
            EmployeeStatus status,
            String address, String imageUrl, String notes
    ) {}
}
