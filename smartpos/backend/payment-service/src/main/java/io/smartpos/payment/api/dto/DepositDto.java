package io.smartpos.payment.api.dto;

import io.smartpos.payment.domain.model.Deposit;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record DepositDto(
        UUID id, String ref, LocalDate date, UUID accountId, UUID categoryId,
        BigDecimal amount, String currency, String description, String notes
) {
    public static DepositDto from(Deposit d) {
        return new DepositDto(d.getId(), d.getRef(), d.getDate(),
                d.getAccountId(), d.getCategoryId(), d.getAmount(),
                d.getCurrency(), d.getDescription(), d.getNotes());
    }

    public record CreateRequest(
            LocalDate date,
            @NotNull UUID accountId,
            UUID categoryId,
            @NotNull @DecimalMin("0.0001") BigDecimal amount,
            String currency,
            String description,
            String notes
    ) {}

    public record CategoryRequest(@NotBlank String name, String description) {}
}
