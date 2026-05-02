package io.smartpos.report.domain.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "export_jobs")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ExportJob {

    public enum Format { PDF, XLSX, CSV }
    public enum Status { PENDING, RUNNING, READY, FAILED }

    @Id @Column(name = "id", nullable = false, updatable = false) private UUID id;

    @Column(name = "user_id")   private UUID userId;
    @Column(name = "report_key", nullable = false) private String reportKey;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "params", nullable = false, columnDefinition = "jsonb")
    @Builder.Default
    private String params = "{}";

    @Enumerated(EnumType.STRING)
    @Column(name = "format", nullable = false)
    private Format format;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private Status status = Status.PENDING;

    @Column(name = "file_url") private String fileUrl;
    @Column(name = "file_size") private Long fileSize;
    @Column(name = "error")     private String error;
    @Column(name = "tenant_id") private UUID tenantId;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "completed_at") private Instant completedAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }
}
