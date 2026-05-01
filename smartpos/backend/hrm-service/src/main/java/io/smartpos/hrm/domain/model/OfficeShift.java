package io.smartpos.hrm.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "office_shifts")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class OfficeShift {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "name", nullable = false) private String name;
    @Column(name = "start_time", nullable = false) private LocalTime startTime;
    @Column(name = "end_time",   nullable = false) private LocalTime endTime;
    @Column(name = "tenant_id") private UUID tenantId;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }
}
