package io.smartpos.ai.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "ai_invocations")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class AiInvocation {

    @Id @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "kind",     nullable = false) private String kind;
    @Column(name = "provider", nullable = false) private String provider;
    @Column(name = "model",    nullable = false) private String model;

    @Column(name = "prompt_tokens")     private Integer promptTokens;
    @Column(name = "completion_tokens") private Integer completionTokens;

    @Column(name = "input_summary") private String inputSummary;
    @Column(name = "output")        private String output;
    @Column(name = "error")         private String error;

    @Column(name = "user_id")    private UUID userId;
    @Column(name = "tenant_id")  private UUID tenantId;
    @Column(name = "duration_ms") private Integer durationMs;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }
}
