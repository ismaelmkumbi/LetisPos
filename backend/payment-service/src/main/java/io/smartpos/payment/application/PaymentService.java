package io.smartpos.payment.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.payment.api.dto.PaymentDto;
import io.smartpos.payment.domain.model.*;
import io.smartpos.payment.domain.repository.*;
import io.smartpos.payment.infrastructure.feign.SalesClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Year;
import java.util.Map;
import java.util.UUID;

/**
 * Core payment flow.
 *
 * Every recording:
 *   1. pessimistic-lock the Account row
 *   2. insert Payment row
 *   3. insert a LedgerEntry (debit or credit depending on ReferenceType)
 *   4. update Account.balance
 *   5. call SalesClient to update paid_total on the referenced Sale/Purchase
 *   6. write PaymentReceived event to outbox
 *   (1-4 + 6 are in the same Postgres tx. 5 is best-effort cross-service.)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final AccountRepository    accountRepo;
    private final PaymentRepository    paymentRepo;
    private final LedgerRepository     ledgerRepo;
    private final SalesClient          salesClient;
    private final OutboxPublisher      outbox;

    @Value("${smartpos.payment.default-currency:TZS}")
    private String defaultCurrency;

    @Transactional(readOnly = true)
    public Page<PaymentDto> search(ReferenceType referenceType, UUID referenceId,
                                   UUID accountId, LocalDate from, LocalDate to,
                                   Pageable pageable) {
        return paymentRepo.search(referenceType, referenceId, accountId, from, to,
                TenantContext.require(), pageable)
                .map(PaymentDto::from);
    }

    @Transactional(readOnly = true)
    public PaymentDto get(UUID id) {
        return paymentRepo.findById(id).map(PaymentDto::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found"));
    }

    @Transactional
    public PaymentDto record(PaymentDto.CreateRequest req, UUID userId) {
        return recordInternal(req, userId, TenantContext.require());
    }

    /**
     * Package-private variant that accepts an explicit tenantId. Used by
     * {@link StripeService} when processing webhooks outside the JWT filter
     * chain (TenantContext is not available).
     */
    @Transactional
    PaymentDto recordInternal(PaymentDto.CreateRequest req, UUID userId, UUID tenantId) {
        Account account = accountRepo.findByIdForUpdate(req.accountId(), tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Account not found"));
        if (!account.isActive()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Account is not active");
        }

        boolean incoming = req.referenceType().incomingForAccount();
        BigDecimal delta = incoming ? req.amount() : req.amount().negate();

        // Update account balance
        BigDecimal newBalance = account.applyDelta(delta);
        accountRepo.save(account);

        // Record payment
        Payment payment = Payment.builder()
                .ref(nextPaymentRef(req.referenceType(), tenantId))
                .date(req.date() != null ? req.date() : LocalDate.now())
                .referenceType(req.referenceType())
                .referenceId(req.referenceId())
                .accountId(account.getId())
                .amount(req.amount())
                .currency(req.currency() != null ? req.currency() : defaultCurrency)
                .method(req.method())
                .externalRef(req.externalRef())
                .notes(req.notes())
                .userId(userId)
                .status(PaymentStatus.COMPLETED)
                .tenantId(tenantId)
                .build();
        Payment saved = paymentRepo.save(payment);

        // Append to ledger
        ledgerRepo.save(LedgerEntry.builder()
                .accountId(account.getId())
                .txnDate(saved.getDate())
                .referenceType(saved.getReferenceType())
                .referenceId(saved.getReferenceId())
                .description("Payment " + saved.getRef())
                .debit(incoming ? req.amount() : BigDecimal.ZERO)
                .credit(incoming ? BigDecimal.ZERO : req.amount())
                .balanceAfter(newBalance)
                .tenantId(tenantId)
                .build());

        // Best-effort: tell Sales/Purchases about this payment
        reconcileWithSales(saved);

        // Rich payload for Report Service fact_payments_daily projection
        Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("paymentId",     saved.getId().toString());
        payload.put("ref",           saved.getRef());
        payload.put("date",          saved.getDate().toString());
        payload.put("referenceType", saved.getReferenceType().name());
        payload.put("referenceId",   saved.getReferenceId().toString());
        payload.put("accountId",     saved.getAccountId().toString());
        payload.put("amount",        saved.getAmount());
        payload.put("amountIn",      incoming ? saved.getAmount() : BigDecimal.ZERO);
        payload.put("amountOut",     incoming ? BigDecimal.ZERO   : saved.getAmount());
        payload.put("method",        saved.getMethod().name());
        payload.put("currency",      saved.getCurrency());
        payload.put("tenantId",      saved.getTenantId() == null ? null : saved.getTenantId().toString());
        outbox.publish("Payment", saved.getId(), "PaymentReceived", payload, tenantId);

        return PaymentDto.from(saved);
    }

    @Transactional
    public void markRefunded(UUID paymentId, String reason) {
        Payment p = paymentRepo.findById(paymentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Payment not found"));
        if (p.getStatus() == PaymentStatus.REFUNDED) return;
        p.setStatus(PaymentStatus.REFUNDED);
        if (reason != null) p.setNotes((p.getNotes() == null ? "" : p.getNotes() + " | ") + "Refunded: " + reason);
        paymentRepo.save(p);
        outbox.publish("Payment", p.getId(), "PaymentRefunded",
                Map.of("paymentId", p.getId(), "reason", reason == null ? "" : reason),
                p.getTenantId());
    }

    @Transactional(readOnly = true)
    public Page<io.smartpos.payment.api.dto.SupplierPaymentDto> searchSupplierPayments(
            UUID supplierId, String method, LocalDate dateFrom, LocalDate dateTo,
            String search, Pageable pageable) {
        return paymentRepo.findSupplierPaymentsRaw(
                TenantContext.require(), method, dateFrom, dateTo, pageable)
                .map(row -> new io.smartpos.payment.api.dto.SupplierPaymentDto(
                    (UUID) row[0],
                    (UUID) row[2],
                    (String) row[3],
                    (UUID) row[1],
                    (String) row[4],
                    (BigDecimal) row[5],
                    (String) row[6],
                    (String) row[7],
                    ((java.sql.Date) row[8]).toLocalDate(),
                    (UUID) row[9],
                    (String) row[10]
                ));
    }

    @Transactional
    public io.smartpos.payment.api.dto.SupplierPaymentDto recordSupplierPayment(
            io.smartpos.payment.api.dto.SupplierPaymentDto.CreateSupplierPaymentRequest req, UUID userId) {

        UUID tenantId = TenantContext.require();
        UUID referenceId = req.purchaseId() != null ? req.purchaseId() : req.supplierId();

        PaymentDto.CreateRequest paymentReq = new PaymentDto.CreateRequest(
                req.date() != null ? req.date() : LocalDate.now(),
                ReferenceType.PURCHASE,
                referenceId,
                req.accountId(),
                req.amount(),
                null, // currency — use default
                req.method(),
                req.reference(),
                req.notes()
        );
        PaymentDto payment = recordInternal(paymentReq, userId, tenantId);

        // Look up supplier name and purchase ref for the response DTO
        String supplierName = null;
        String purchaseRef = null;
        try {
            if (req.purchaseId() != null) {
                var pur = salesClient.getPurchase(req.purchaseId());
                if (pur != null) {
                    purchaseRef = pur.ref() != null ? pur.ref() : null;
                    supplierName = pur.supplierName() != null ? pur.supplierName() : null;
                    if (supplierName == null) {
                        supplierName = pur.supplierId() != null ? pur.supplierId().toString() : null;
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Failed to look up purchase/supplier details for supplier payment: {}", e.getMessage());
        }

        // Try to get account name
        String accountName = null;
        try {
            accountName = accountRepo.findById(req.accountId()).map(a -> a.getName()).orElse(null);
        } catch (Exception e) {
            log.warn("Failed to look up account name: {}", e.getMessage());
        }

        return new io.smartpos.payment.api.dto.SupplierPaymentDto(
                payment.id(),
                req.supplierId(),
                supplierName != null ? supplierName : req.supplierId().toString(),
                referenceId,
                purchaseRef != null ? purchaseRef : (req.purchaseId() != null ? req.purchaseId().toString() : "—"),
                payment.amount(),
                payment.method().name(),
                payment.externalRef(),
                payment.date(),
                req.accountId(),
                accountName != null ? accountName : req.accountId().toString()
        );
    }

    // ---- helpers ----

    private void reconcileWithSales(Payment p) {
        try {
            // Phase 6c — pass the payment ID so Sales can dedup the Feign and Kafka paths.
            SalesClient.ApplyPaymentRequest req =
                    new SalesClient.ApplyPaymentRequest(p.getId(), p.getAmount());
            switch (p.getReferenceType()) {
                case SALE           -> salesClient.applySalePayment(p.getReferenceId(), req);
                case PURCHASE       -> salesClient.applyPurchasePayment(p.getReferenceId(), req);
                case SALE_RETURN, PURCHASE_RETURN, EXPENSE, DEPOSIT, TRANSFER -> { /* nothing to reconcile */ }
            }
        } catch (Exception e) {
            // Do not roll back the payment — the outbox event will let the
            // downstream catch up when the relay / consumer is wired.
            log.warn("paid_total reconciliation with Sales failed for payment {}: {}",
                    p.getId(), e.getMessage());
        }
    }

    private String nextPaymentRef(ReferenceType rt, UUID tenantId) {
        String shortCode = switch (rt) {
            case SALE            -> "PSR";      // payment for sale (received)
            case PURCHASE        -> "PPP";      // payment to purchase (paid)
            case SALE_RETURN     -> "PSRT";     // refund to customer
            case PURCHASE_RETURN -> "PPRT";     // refund from supplier
            case EXPENSE         -> "EXP";
            case DEPOSIT         -> "DEP";
            case TRANSFER        -> "TRF";
        };
        String prefix = shortCode + "-" + Year.now().getValue() + "-";
        long n = paymentRepo.countByRefStartingWithAndTenantId(prefix, tenantId) + 1;
        return prefix + String.format("%06d", n);
    }
}
