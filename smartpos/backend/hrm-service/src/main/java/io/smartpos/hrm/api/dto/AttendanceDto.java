package io.smartpos.hrm.api.dto;

import io.smartpos.hrm.domain.model.Attendance;
import io.smartpos.hrm.domain.model.AttendanceStatus;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record AttendanceDto(
        UUID id, UUID employeeId, LocalDate workDate,
        Instant checkIn, Instant checkOut,
        AttendanceStatus status, BigDecimal hoursWorked, String notes
) {
    public static AttendanceDto from(Attendance a) {
        return new AttendanceDto(a.getId(), a.getEmployeeId(), a.getWorkDate(),
                a.getCheckIn(), a.getCheckOut(), a.getStatus(), a.getHoursWorked(), a.getNotes());
    }

    public record CheckInRequest(@NotNull UUID employeeId, Instant timestamp) {}
    public record CheckOutRequest(@NotNull UUID employeeId, Instant timestamp) {}

    public record UpsertRequest(
            @NotNull UUID employeeId,
            @NotNull LocalDate workDate,
            Instant checkIn, Instant checkOut,
            AttendanceStatus status,
            BigDecimal hoursWorked,
            String notes
    ) {}
}
