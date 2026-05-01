package io.smartpos.payment.api.dto;

import io.smartpos.payment.domain.model.Payment;
import io.smartpos.payment.domain.model.PaymentMethod;
import io.smartpos.payment.domain.model.PaymentStatus;
import io.smartpos.payment.domain.model.ReferenceType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record PaymentDto(
        UUID id, String ref, LocalDate date,
        ReferenceType referenceType, UUID referenceId,
        UUID accountId, BigDecimal amount, String currency,
        PaymentMethod method, String externalRef, String notes,
        PaymentStatus status
) {
    public static PaymentDto from(Payment p) {
        return new PaymentDto(p.getId(), p.getRef(), p.getDate(),
                p.getReferenceType(), p.getReferenceId(),
                p.getAccountId(), p.getAmount(), p.getCurrency(),
                p.getMethod(), p.getExternalRef(), p.getNotes(), p.getStatus());
    }

    public record CreateRequest(
            LocalDate date,
            @NotNull ReferenceType referenceType,
            @NotNull UUID referenceId,
            @NotNull UUID accountId,
            @NotNull @DecimalMin("0.0001") BigDecimal amount,
            String currency,
            @NotNull PaymentMethod method,
            String externalRef,
            String notes
    ) {}
}
