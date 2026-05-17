package io.smartpos.report.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity @Table(name = "dashboard_data_freshness")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class DataFreshness {
    @Id
    @Column(name = "source", length = 64, nullable = false, updatable = false)
    private String source;

    @Column(name = "last_updated_at", nullable = false)
    private Instant lastUpdatedAt;

    @Column(name = "status", length = 16, nullable = false)
    @Builder.Default
    private String status = "FRESH";

    @Column(name = "error_message")
    private String errorMessage;

    @Column(name = "checked_at", nullable = false)
    private Instant checkedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (lastUpdatedAt == null) lastUpdatedAt = now;
        if (checkedAt == null) checkedAt = now;
    }
}
