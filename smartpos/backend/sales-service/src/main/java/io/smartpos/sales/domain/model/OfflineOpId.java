package io.smartpos.sales.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Per-row idempotency record for the offline POS sync. Looking up by
 * (terminal_id, client_op_id) lets us return the existing server sale id
 * if the same op is replayed — necessary because the client retries the
 * whole batch on connectivity blips.
 */
@Entity
@Table(name = "offline_op_ids")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class OfflineOpId {

    @Id @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "terminal_id", nullable = false) private UUID terminalId;
    @Column(name = "client_op_id", nullable = false) private String clientOpId;
    @Column(name = "sale_id") private UUID saleId;

    @Column(name = "status", nullable = false)
    @Builder.Default
    private String status = "OK";

    @Column(name = "error") private String error;

    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }
}
