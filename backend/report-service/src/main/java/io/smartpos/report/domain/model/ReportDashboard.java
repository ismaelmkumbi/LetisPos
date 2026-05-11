package io.smartpos.report.domain.model;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity @Table(name = "report_dashboards")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ReportDashboard {
    @Id @Column(name = "id", nullable = false, updatable = false) private UUID id;
    @Column(name = "tenant_id", nullable = false) private UUID tenantId;
    @Column(name = "user_id") private UUID userId;
    @Column(name = "name", nullable = false) private String name;
    @Column(name = "layout", columnDefinition = "jsonb", nullable = false) private String layout;
    @Column(name = "filters", columnDefinition = "jsonb") private String filters;
    @Column(name = "shared") @Builder.Default private boolean shared = false;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    @PrePersist void onCreate() {
        if (id == null) id = UUID.randomUUID();
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }
    @PreUpdate void onUpdate() { updatedAt = Instant.now(); }
}
