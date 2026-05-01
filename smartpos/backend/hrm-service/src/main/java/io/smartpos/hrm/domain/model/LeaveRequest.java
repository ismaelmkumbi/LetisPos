package io.smartpos.hrm.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "leave_requests")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class LeaveRequest {

    @Id @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "employee_id",   nullable = false) private UUID employeeId;
    @Column(name = "leave_type_id", nullable = false) private UUID leaveTypeId;
    @Column(name = "start_date",    nullable = false) private LocalDate startDate;
    @Column(name = "end_date",      nullable = false) private LocalDate endDate;

    @Column(name = "days", nullable = false)
    @Builder.Default
    private BigDecimal days = BigDecimal.ZERO;

    @Column(name = "reason") private String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private LeaveStatus status = LeaveStatus.PENDING;

    @Column(name = "decided_at")    private Instant decidedAt;
    @Column(name = "decided_by")    private UUID    decidedBy;
    @Column(name = "decision_note") private String  decisionNote;
    @Column(name = "tenant_id")     private UUID    tenantId;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }
    @PreUpdate void onUpdate() { updatedAt = Instant.now(); }
}
