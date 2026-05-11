package io.smartpos.product.api.dto;

import io.smartpos.product.domain.model.StoreCreditTransaction;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record StoreCreditTransactionDto(
        UUID id,
        UUID customerId,
        BigDecimal amount,
        String type,
        String reference,
        String notes,
        Instant createdAt
) {
    public static StoreCreditTransactionDto from(StoreCreditTransaction t) {
        return new StoreCreditTransactionDto(t.getId(), t.getCustomerId(),
                t.getAmount(), t.getType(), t.getReference(), t.getNotes(), t.getCreatedAt());
    }

    public record AddCreditRequest(
            @NotNull UUID customerId,
            @Positive BigDecimal amount,
            String reference,
            String notes
    ) {}

    public record RedeemRequest(
            @NotNull UUID customerId,
            @Positive BigDecimal amount,
            String posReference
    ) {}

    public record CustomerBalance(
            UUID customerId,
            BigDecimal balance
    ) {}
}
