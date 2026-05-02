package io.smartpos.payment.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "account_transfers")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class AccountTransfer {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "ref", nullable = false) private String ref;

    @Column(name = "date", nullable = false)
    @Builder.Default
    private LocalDate date = LocalDate.now();

    @Column(name = "from_account_id", nullable = false) private UUID fromAccountId;
    @Column(name = "to_account_id",   nullable = false) private UUID toAccountId;

    @Column(name = "amount", nullable = false) private BigDecimal amount;

    @Column(name = "notes") private String notes;

    @Column(name = "user_id")   private UUID userId;
    @Column(name = "tenant_id") private UUID tenantId;

    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }
}
