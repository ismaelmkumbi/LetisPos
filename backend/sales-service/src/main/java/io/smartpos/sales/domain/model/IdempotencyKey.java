package io.smartpos.sales.domain.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

@Entity
@Table(name = "idempotency_keys")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class IdempotencyKey {

    @Id
    @Column(name = "key_value", nullable = false, updatable = false)
    private String keyValue;

    @Column(name = "method", nullable = false) private String method;
    @Column(name = "path",   nullable = false) private String path;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "response", columnDefinition = "jsonb")
    private String response;

    @Column(name = "status_code") private Integer statusCode;

    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "expires_at", nullable = false) private Instant expiresAt;

    @PrePersist
    void onCreate() {
        if (createdAt == null) createdAt = Instant.now();
    }
}
