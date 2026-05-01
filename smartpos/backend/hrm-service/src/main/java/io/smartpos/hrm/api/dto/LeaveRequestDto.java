package io.smartpos.hrm.api.dto;

import io.smartpos.hrm.domain.model.LeaveRequest;
import io.smartpos.hrm.domain.model.LeaveStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record LeaveRequestDto(
        UUID id, UUID employeeId, UUID leaveTypeId,
        LocalDate startDate, LocalDate endDate, BigDecimal days,
        String reason, LeaveStatus status,
        Instant decidedAt, UUID decidedBy, String decisionNote
) {
    public static LeaveRequestDto from(LeaveRequest r) {
        return new LeaveRequestDto(r.getId(), r.getEmployeeId(), r.getLeaveTypeId(),
                r.getStartDate(), r.getEndDate(), r.getDays(), r.getReason(),
                r.getStatus(), r.getDecidedAt(), r.getDecidedBy(), r.getDecisionNote());
    }

    public record CreateRequest(
            @NotNull UUID employeeId,
            @NotNull UUID leaveTypeId,
            @NotNull LocalDate startDate,
            @NotNull LocalDate endDate,
            String reason
    ) {}

    public record DecisionRequest(@NotNull LeaveStatus status, @NotBlank String note) {}
}
