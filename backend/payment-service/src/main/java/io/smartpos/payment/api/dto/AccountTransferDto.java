package io.smartpos.payment.api.dto;

import io.smartpos.payment.domain.model.AccountTransfer;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record AccountTransferDto(
        UUID id, String ref, LocalDate date,
        UUID fromAccountId, UUID toAccountId,
        BigDecimal amount, String notes
) {
    public static AccountTransferDto from(AccountTransfer t) {
        return new AccountTransferDto(t.getId(), t.getRef(), t.getDate(),
                t.getFromAccountId(), t.getToAccountId(), t.getAmount(), t.getNotes());
    }

    public record CreateRequest(
            LocalDate date,
            @NotNull UUID fromAccountId,
            @NotNull UUID toAccountId,
            @NotNull @DecimalMin("0.0001") BigDecimal amount,
            String notes
    ) {}
}
