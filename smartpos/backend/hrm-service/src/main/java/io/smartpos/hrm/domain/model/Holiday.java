package io.smartpos.hrm.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "holidays")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Holiday {

    @Id @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "name", nullable = false) private String name;
    @Column(name = "holiday_date", nullable = false) private LocalDate holidayDate;
    @Column(name = "description") private String description;
    @Column(name = "tenant_id") private UUID tenantId;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }
}
