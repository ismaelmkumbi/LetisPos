package io.smartpos.payment.api.dto;

import io.smartpos.payment.domain.model.LedgerEntry;
import io.smartpos.payment.domain.model.ReferenceType;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record LedgerDto(
        UUID id, UUID accountId, LocalDate txnDate,
        ReferenceType referenceType, UUID referenceId,
        String description,
        BigDecimal debit, BigDecimal credit, BigDecimal balanceAfter,
        Instant createdAt
) {
    public static LedgerDto from(LedgerEntry l) {
        return new LedgerDto(l.getId(), l.getAccountId(), l.getTxnDate(),
                l.getReferenceType(), l.getReferenceId(), l.getDescription(),
                l.getDebit(), l.getCredit(), l.getBalanceAfter(), l.getCreatedAt());
    }
}
