package io.smartpos.hrm.api.dto;

import io.smartpos.hrm.domain.model.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

/**
 * Lightweight DTOs for the simple org-structure entities.
 * Keeping them in one file because each one is just (id, name, …).
 */
public final class OrgDtos {

    private OrgDtos() {}

    public record DepartmentDto(UUID id, String name, String description) {
        public static DepartmentDto from(Department d) {
            return new DepartmentDto(d.getId(), d.getName(), d.getDescription());
        }
        public record CreateRequest(@NotBlank @Size(max=120) String name, String description) {}
    }

    public record DesignationDto(UUID id, String name, UUID departmentId, String description) {
        public static DesignationDto from(Designation d) {
            return new DesignationDto(d.getId(), d.getName(), d.getDepartmentId(), d.getDescription());
        }
        public record CreateRequest(
                @NotBlank @Size(max=120) String name,
                UUID departmentId,
                String description) {}
    }

    public record ShiftDto(UUID id, String name, LocalTime startTime, LocalTime endTime) {
        public static ShiftDto from(OfficeShift s) {
            return new ShiftDto(s.getId(), s.getName(), s.getStartTime(), s.getEndTime());
        }
        public record CreateRequest(
                @NotBlank @Size(max=120) String name,
                @NotNull LocalTime startTime,
                @NotNull LocalTime endTime) {}
    }

    public record HolidayDto(UUID id, String name, LocalDate holidayDate, String description) {
        public static HolidayDto from(Holiday h) {
            return new HolidayDto(h.getId(), h.getName(), h.getHolidayDate(), h.getDescription());
        }
        public record CreateRequest(
                @NotBlank @Size(max=120) String name,
                @NotNull LocalDate holidayDate,
                String description) {}
    }

    public record LeaveTypeDto(UUID id, String name, int daysPerYear, boolean paid) {
        public static LeaveTypeDto from(LeaveType lt) {
            return new LeaveTypeDto(lt.getId(), lt.getName(), lt.getDaysPerYear(), lt.isPaid());
        }
        public record CreateRequest(
                @NotBlank @Size(max=80) String name,
                int daysPerYear,
                Boolean paid) {}
    }
}
