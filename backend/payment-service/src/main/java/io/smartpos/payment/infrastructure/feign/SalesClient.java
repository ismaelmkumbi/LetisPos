package io.smartpos.payment.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Calls Sales Service to reconcile paid_total / payment_status on the
 * referenced document. This is the only cross-service call Payment makes.
 *
 * Eventual consistency: Payment Service writes its own data first (Payment +
 * ledger entry) inside its tx, then fires-and-forgets this Feign call. If it
 * fails, we log and continue — the outbox event still fires so Sales Service
 * will catch up when the Kafka consumer is wired (Phase 4b).
 */
@FeignClient(name = "sales-service")
public interface SalesClient {

    /**
     * {@code paymentId} is the idempotency key on the Sales side
     * (Phase 6c — {@code sale_payments_applied} table). Pass the source Payment
     * Service payment ID so duplicate Feign + Kafka deliveries are dedup'd.
     */
    record ApplyPaymentRequest(UUID paymentId, BigDecimal amount) {}

    /** Lightweight purchase projection used only by Payment Service + SupplierPayment flow. */
    record PurchaseSummary(UUID id, String ref, UUID supplierId, String supplierName) {}

    @PostMapping("/api/v1/sales/{id}/apply-payment")
    ResponseEntity<Void> applySalePayment(@PathVariable("id") UUID saleId,
                                          @RequestBody ApplyPaymentRequest body);

    @PostMapping("/api/v1/purchases/{id}/apply-payment")
    ResponseEntity<Void> applyPurchasePayment(@PathVariable("id") UUID purchaseId,
                                              @RequestBody ApplyPaymentRequest body);

    @GetMapping("/api/v1/purchases/{id}")
    PurchaseSummary getPurchase(@PathVariable("id") UUID purchaseId);

    /** Outstanding purchase projection for AP aging. */
    record OutstandingPurchase(UUID id, String ref, LocalDate date, LocalDate dueDate,
                               String paymentStatus, BigDecimal grandTotal, BigDecimal paidTotal) {}

    /** Outstanding sale projection for AR aging. */
    record OutstandingSale(UUID id, String ref, LocalDate date, LocalDate dueDate,
                           String paymentStatus, BigDecimal grandTotal, BigDecimal paidTotal) {}

    @GetMapping("/api/v1/purchases/outstanding")
    List<OutstandingPurchase> outstandingPurchases();

    @GetMapping("/api/v1/sales/outstanding")
    List<OutstandingSale> outstandingSales();
}
