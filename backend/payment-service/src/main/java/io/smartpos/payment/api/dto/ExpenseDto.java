package io.smartpos.payment.api.dto;

import io.smartpos.payment.domain.model.Expense;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record ExpenseDto(
        UUID id, String ref, LocalDate date, UUID accountId, UUID categoryId,
        BigDecimal amount, String currency, String description, String notes
) {
    public static ExpenseDto from(Expense e) {
        return new ExpenseDto(e.getId(), e.getRef(), e.getDate(),
                e.getAccountId(), e.getCategoryId(), e.getAmount(),
                e.getCurrency(), e.getDescription(), e.getNotes());
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

    public record CategoryRequest(@NotBlank String name, String description, UUID coaId) {}
}
