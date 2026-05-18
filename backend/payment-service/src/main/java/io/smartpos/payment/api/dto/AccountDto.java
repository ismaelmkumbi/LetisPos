package io.smartpos.payment.api.dto;

import io.smartpos.payment.domain.model.Account;
import io.smartpos.payment.domain.model.AccountType;
import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;
import java.util.UUID;

public record AccountDto(
        UUID id, String name, String number, AccountType type,
        String currency, BigDecimal initialBalance, BigDecimal balance,
        boolean active, String notes, UUID coaId
) {
    public static AccountDto from(Account a) {
        return new AccountDto(a.getId(), a.getName(), a.getNumber(), a.getType(),
                a.getCurrency(), a.getInitialBalance(), a.getBalance(),
                a.isActive(), a.getNotes(), a.getCoaId());
    }

    public record CreateRequest(
            @NotBlank String name,
            String number,
            AccountType type,
            String currency,
            BigDecimal initialBalance,
            String notes,
            UUID coaId
    ) {}
}
