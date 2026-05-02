package io.smartpos.sales.application;

import io.smartpos.sales.api.dto.CreateSaleRequest;
import io.smartpos.sales.api.dto.RecurringInvoiceDto;
import io.smartpos.sales.api.dto.SaleDto;
import io.smartpos.sales.api.dto.SaleLineInput;
import io.smartpos.sales.domain.model.*;
import io.smartpos.sales.domain.repository.RecurringInvoiceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Recurring invoice CRUD + the daily generator.
 *
 * The scheduler is intentionally simple:
 *   1. Pick up to N due rows whose next_run_date <= today.
 *   2. For each, materialise a Sale via {@link SaleService#create} (this also
 *      reserves stock and emits SaleConfirmed via the existing saga).
 *   3. Advance next_run_date by frequency; if end_date passed or
 *      occurrences_count == occurrences_max, mark COMPLETED.
 *
 * Failures on a single template never block the others — each is run in a
 * separate transactional method via {@link #generateOne}.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RecurringInvoiceService {

    private final RecurringInvoiceRepository repo;
    private final SaleService saleService;

    @Transactional(readOnly = true)
    public Page<RecurringInvoiceDto> search(RecurringStatus status, UUID customerId,
                                            UUID warehouseId, Pageable pageable) {
        return repo.search(status, customerId, warehouseId, pageable).map(RecurringInvoiceDto::from);
    }

    @Transactional(readOnly = true)
    public RecurringInvoiceDto get(UUID id) {
        return repo.findById(id).map(RecurringInvoiceDto::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Recurring invoice not found"));
    }

    @Transactional
    public RecurringInvoiceDto create(RecurringInvoiceDto.CreateRequest req) {
        if (repo.existsByRefIgnoreCase(req.ref())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Ref already exists");
        }
        RecurringInvoice r = RecurringInvoice.builder()
                .ref(req.ref()).name(req.name())
                .customerId(req.customerId()).warehouseId(req.warehouseId())
                .frequency(req.frequency())
                .intervalCount(req.intervalCount() == null ? 1 : req.intervalCount())
                .startDate(req.startDate()).endDate(req.endDate())
                .nextRunDate(req.startDate())
                .occurrencesMax(req.occurrencesMax())
                .currency(Optional.ofNullable(req.currency()).orElse("TZS"))
                .discount(req.discount()).shipping(req.shipping())
                .taxMethod(req.taxMethod())
                .sendNotification(req.sendNotification() == null || req.sendNotification())
                .notes(req.notes())
                .status(RecurringStatus.ACTIVE)
                .build();
        addLines(r, req.lines());
        return RecurringInvoiceDto.from(repo.save(r));
    }

    @Transactional
    public RecurringInvoiceDto update(UUID id, RecurringInvoiceDto.UpdateRequest req) {
        RecurringInvoice r = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Recurring invoice not found"));
        if (req.name()             != null) r.setName(req.name());
        if (req.endDate()          != null) r.setEndDate(req.endDate());
        if (req.occurrencesMax()   != null) r.setOccurrencesMax(req.occurrencesMax());
        if (req.discount()         != null) r.setDiscount(req.discount());
        if (req.shipping()         != null) r.setShipping(req.shipping());
        if (req.taxMethod()        != null) r.setTaxMethod(req.taxMethod());
        if (req.sendNotification() != null) r.setSendNotification(req.sendNotification());
        if (req.notes()            != null) r.setNotes(req.notes());
        if (req.lines() != null && !req.lines().isEmpty()) {
            r.getLines().clear();
            addLines(r, req.lines());
        }
        return RecurringInvoiceDto.from(repo.save(r));
    }

    @Transactional
    public RecurringInvoiceDto pause(UUID id)    { return setStatus(id, RecurringStatus.PAUSED); }

    @Transactional
    public RecurringInvoiceDto resume(UUID id)   { return setStatus(id, RecurringStatus.ACTIVE); }

    @Transactional
    public RecurringInvoiceDto cancel(UUID id)   { return setStatus(id, RecurringStatus.CANCELLED); }

    @Transactional
    public void delete(UUID id) {
        RecurringInvoice r = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Recurring invoice not found"));
        r.softDelete();
        repo.save(r);
    }

    /** Manually trigger a generation for one template (admin button). */
    @Transactional
    public SaleDto runNow(UUID id) {
        RecurringInvoice r = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Recurring invoice not found"));
        if (r.getStatus() != RecurringStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Template is not ACTIVE");
        }
        return generateOne(r);
    }

    /** Daily scheduler — runs at 02:00 UTC by default. */
    @Scheduled(cron = "${smartpos.sales.recurring.cron:0 0 2 * * *}")
    public void runDaily() {
        LocalDate today = LocalDate.now();
        List<RecurringInvoice> due = repo.findDue(today, PageRequest.of(0, 100));
        if (due.isEmpty()) return;
        log.info("Recurring scheduler: {} templates due", due.size());
        for (RecurringInvoice r : due) {
            try {
                generateOne(r);
            } catch (Exception e) {
                log.warn("Failed to generate sale for recurring {}: {}", r.getRef(), e.getMessage());
            }
        }
    }

    // ----------------------------------------------------------------
    // helpers
    // ----------------------------------------------------------------

    @Transactional
    public SaleDto generateOne(RecurringInvoice r) {
        // Each line in the template becomes a SaleLineInput.
        List<SaleLineInput> saleLines = new ArrayList<>(r.getLines().size());
        for (RecurringInvoiceLine l : r.getLines()) {
            saleLines.add(new SaleLineInput(
                    l.getProductId(), l.getVariantId(),
                    l.getProductNameSnapshot(), l.getProductCodeSnapshot(),
                    l.getUnitPrice(), l.getQty(),
                    l.getDiscount(), l.getDiscountType(),
                    l.getTaxRate(), l.getTaxMethod()));
        }
        CreateSaleRequest req = new CreateSaleRequest(
                LocalDate.now(),
                r.getCustomerId(),
                r.getWarehouseId(),
                saleLines,
                r.getDiscount(),
                r.getTaxMethod(),
                r.getShipping(),
                r.getCurrency(),
                null,
                r.getNotes(),
                Boolean.FALSE);

        SaleDto generated = saleService.create(req, null, false);

        // Advance schedule
        r.setLastRunDate(LocalDate.now());
        r.setOccurrencesCount(r.getOccurrencesCount() + 1);
        LocalDate nextDate = r.getFrequency().advance(r.getNextRunDate(), r.getIntervalCount());
        r.setNextRunDate(nextDate);

        boolean reachedEnd = (r.getEndDate() != null && nextDate.isAfter(r.getEndDate()))
                || (r.getOccurrencesMax() != null && r.getOccurrencesCount() >= r.getOccurrencesMax());
        if (reachedEnd) r.setStatus(RecurringStatus.COMPLETED);
        repo.save(r);
        return generated;
    }

    private RecurringInvoiceDto setStatus(UUID id, RecurringStatus status) {
        RecurringInvoice r = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Recurring invoice not found"));
        r.setStatus(status);
        return RecurringInvoiceDto.from(repo.save(r));
    }

    private void addLines(RecurringInvoice r, List<RecurringInvoiceDto.LineInput> inputs) {
        int idx = 0;
        for (RecurringInvoiceDto.LineInput in : inputs) {
            r.getLines().add(RecurringInvoiceLine.builder()
                    .productId(in.productId())
                    .variantId(in.variantId())
                    .productNameSnapshot(in.productName())
                    .productCodeSnapshot(in.productCode())
                    .qty(in.qty())
                    .unitPrice(in.unitPrice())
                    .discount(in.discount())
                    .discountType(in.discountType())
                    .taxRate(in.taxRate())
                    .taxMethod(in.taxMethod())
                    .position(in.position() == null ? idx : in.position())
                    .build());
            idx++;
        }
    }
}
