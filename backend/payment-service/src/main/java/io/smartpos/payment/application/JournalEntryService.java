package io.smartpos.payment.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.payment.api.dto.JournalEntryDto;
import io.smartpos.payment.domain.model.ChartOfAccount;
import io.smartpos.payment.domain.model.JournalEntry;
import io.smartpos.payment.domain.model.JournalEntryLine;
import io.smartpos.payment.domain.model.JournalStatus;
import io.smartpos.payment.domain.repository.ChartOfAccountRepository;
import io.smartpos.payment.domain.repository.JournalEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Manages the General Ledger journal:
 *   create  → DRAFT
 *   post    → DRAFT → POSTED (validates DR=CR, account exists & is postable)
 *   void    → POSTED → VOIDED (reason required; statement totals exclude it)
 */
@Service
@RequiredArgsConstructor
public class JournalEntryService {

    private final JournalEntryRepository repo;
    private final ChartOfAccountRepository accountRepo;

    @Transactional(readOnly = true)
    public Page<JournalEntryDto> search(JournalStatus status, LocalDate from, LocalDate to,
                                        String source, Pageable pageable) {
        return repo.search(status, from, to, source, TenantContext.require(), pageable).map(JournalEntryDto::from);
    }

    @Transactional(readOnly = true)
    public JournalEntryDto get(UUID id) {
        return repo.findById(id).map(JournalEntryDto::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Journal entry not found"));
    }

    @Transactional
    public JournalEntryDto create(JournalEntryDto.CreateRequest req) {
        UUID tenantId = TenantContext.require();
        if (repo.existsByRefIgnoreCaseAndTenantId(req.ref(), tenantId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Journal ref already exists");
        }
        JournalEntry je = JournalEntry.builder()
                .ref(req.ref())
                .entryDate(req.entryDate() == null ? LocalDate.now() : req.entryDate())
                .memo(req.memo())
                .source(req.source() == null ? "MANUAL" : req.source())
                .sourceRef(req.sourceRef())
                .status(JournalStatus.DRAFT)
                .tenantId(tenantId)
                .build();

        addLines(je, req.lines());
        JournalEntry saved = repo.save(je);

        if (Boolean.TRUE.equals(req.postImmediately())) {
            return post(saved.getId(), null);
        }
        return JournalEntryDto.from(saved);
    }

    @Transactional
    public JournalEntryDto update(UUID id, JournalEntryDto.UpdateRequest req) {
        JournalEntry je = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Journal entry not found"));
        if (je.getStatus() != JournalStatus.DRAFT) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only DRAFT entries can be updated");
        }
        if (req.entryDate() != null) je.setEntryDate(req.entryDate());
        if (req.memo()      != null) je.setMemo(req.memo());
        if (req.source()    != null) je.setSource(req.source());
        if (req.sourceRef() != null) je.setSourceRef(req.sourceRef());
        if (req.lines() != null && !req.lines().isEmpty()) {
            je.getLines().clear();
            addLines(je, req.lines());
        }
        return JournalEntryDto.from(repo.save(je));
    }

    @Transactional
    public JournalEntryDto post(UUID id, UUID userId) {
        JournalEntry je = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Journal entry not found"));
        if (je.getStatus() != JournalStatus.DRAFT) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only DRAFT entries can be posted");
        }
        validateBalanced(je);
        je.setStatus(JournalStatus.POSTED);
        je.setPostedAt(Instant.now());
        je.setPostedBy(userId);
        return JournalEntryDto.from(repo.save(je));
    }

    @Transactional
    public JournalEntryDto voidEntry(UUID id, String reason, UUID userId) {
        JournalEntry je = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Journal entry not found"));
        if (je.getStatus() == JournalStatus.VOIDED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Already voided");
        }
        je.setStatus(JournalStatus.VOIDED);
        je.setVoidedAt(Instant.now());
        je.setVoidedBy(userId);
        je.setVoidReason(reason);
        return JournalEntryDto.from(repo.save(je));
    }

    @Transactional
    public void delete(UUID id) {
        JournalEntry je = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Journal entry not found"));
        if (je.getStatus() != JournalStatus.DRAFT) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only DRAFT entries can be deleted");
        }
        repo.delete(je);
    }

    // ----------------------------------------------------------------
    // helpers
    // ----------------------------------------------------------------

    private void addLines(JournalEntry je, List<JournalEntryDto.LineInput> inputs) {
        int idx = 0;
        for (JournalEntryDto.LineInput in : inputs) {
            ChartOfAccount acc = accountRepo.findById(in.accountId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Account not found: " + in.accountId()));
            // Verify account belongs to same tenant as the journal entry
            if (je.getTenantId() != null && !je.getTenantId().equals(acc.getTenantId())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Account " + acc.getCode() + " does not belong to the same tenant");
            }
            if (!acc.isPostable()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Account " + acc.getCode() + " is a summary account; pick a leaf");
            }
            BigDecimal dr = in.debit()  == null ? BigDecimal.ZERO : in.debit();
            BigDecimal cr = in.credit() == null ? BigDecimal.ZERO : in.credit();
            // Mirror the DB-level invariant: exactly one side > 0.
            if (dr.signum() > 0 == cr.signum() > 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Each line must have debit XOR credit > 0");
            }
            je.getLines().add(JournalEntryLine.builder()
                    .accountId(in.accountId())
                    .debit(dr).credit(cr)
                    .memo(in.memo())
                    .position(in.position() == null ? idx : in.position())
                    .build());
            idx++;
        }
    }

    private void validateBalanced(JournalEntry je) {
        BigDecimal dr = je.getLines().stream().map(JournalEntryLine::getDebit).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal cr = je.getLines().stream().map(JournalEntryLine::getCredit).reduce(BigDecimal.ZERO, BigDecimal::add);
        if (dr.compareTo(cr) != 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Journal does not balance: DR=" + dr + " CR=" + cr);
        }
        if (dr.signum() == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Journal entry has zero amount");
        }
    }
}
