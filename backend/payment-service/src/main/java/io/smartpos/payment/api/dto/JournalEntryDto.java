package io.smartpos.payment.api.dto;

import io.smartpos.payment.domain.model.JournalEntry;
import io.smartpos.payment.domain.model.JournalEntryLine;
import io.smartpos.payment.domain.model.JournalStatus;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record JournalEntryDto(
        UUID id,
        String ref,
        LocalDate entryDate,
        String memo,
        String source,
        String sourceRef,
        JournalStatus status,
        Instant postedAt,
        UUID postedBy,
        Instant voidedAt,
        UUID voidedBy,
        String voidReason,
        BigDecimal totalDebit,
        BigDecimal totalCredit,
        List<LineDto> lines,
        Instant createdAt
) {
    public static JournalEntryDto from(JournalEntry e) {
        BigDecimal dr = e.getLines().stream().map(JournalEntryLine::getDebit).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal cr = e.getLines().stream().map(JournalEntryLine::getCredit).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new JournalEntryDto(
                e.getId(), e.getRef(), e.getEntryDate(), e.getMemo(), e.getSource(), e.getSourceRef(),
                e.getStatus(), e.getPostedAt(), e.getPostedBy(),
                e.getVoidedAt(), e.getVoidedBy(), e.getVoidReason(),
                dr, cr,
                e.getLines().stream().map(LineDto::from).toList(),
                e.getCreatedAt());
    }

    public record LineDto(UUID id, UUID accountId, BigDecimal debit, BigDecimal credit, String memo, int position) {
        public static LineDto from(JournalEntryLine l) {
            return new LineDto(l.getId(), l.getAccountId(), l.getDebit(), l.getCredit(), l.getMemo(), l.getPosition());
        }
    }

    public record CreateRequest(
            @NotBlank @Size(max = 50) String ref,
            LocalDate entryDate,
            @Size(max = 255) String memo,
            String source,
            String sourceRef,
            @NotNull @Size(min = 2, message = "A journal entry needs at least two lines") List<LineInput> lines,
            Boolean postImmediately
    ) {}

    public record UpdateRequest(
            LocalDate entryDate,
            String memo,
            String source,
            String sourceRef,
            List<LineInput> lines
    ) {}

    public record LineInput(
            @NotNull UUID accountId,
            @DecimalMin("0.0") BigDecimal debit,
            @DecimalMin("0.0") BigDecimal credit,
            String memo,
            Integer position
    ) {}

    public record VoidRequest(@NotBlank String reason) {}
}
