package io.smartpos.sales.infrastructure.kafka;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.smartpos.sales.application.SaleService;
import io.smartpos.sales.domain.model.SalePaymentApplied;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Eventually-consistent fallback path for paid_total reconciliation.
 *
 * <p>Payment Service's primary path is the synchronous Feign callback to
 * {@code POST /sales/{id}/apply-payment}. If that fails (network blip, sales
 * service restart, etc.), Payment still commits its own row and emits
 * {@code PaymentReceived} via outbox. This consumer reads that event and
 * applies the same bump.
 *
 * <p>{@link SaleService#applyPayment} dedup's via the {@code sale_payments_applied}
 * table, so it doesn't matter if both paths land — only one wins.
 *
 * <p>Listens on {@code smartpos.payment.payment-received.v1}, group
 * {@code smartpos-sales-payment-reconciler}.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PaymentEventsConsumer {

    private final ObjectMapper objectMapper;
    private final SaleService  saleService;

    @KafkaListener(topics = "smartpos.payment.payment-received.v1",
                   groupId = "smartpos-sales-payment-reconciler")
    public void onPaymentReceived(String body, Acknowledgment ack) {
        try {
            JsonNode envelope = objectMapper.readTree(body);
            JsonNode p = envelope.path("payload");

            String referenceType = p.path("referenceType").asText("");
            if (!"SALE".equals(referenceType)) {
                // Purchases / returns / expenses don't bump sale.paid_total.
                ack.acknowledge();
                return;
            }

            UUID paymentId = UUID.fromString(p.path("paymentId").asText());
            UUID saleId    = UUID.fromString(p.path("referenceId").asText());
            BigDecimal amount = new BigDecimal(p.path("amount").asText("0"));

            boolean applied = saleService.applyPayment(
                    saleId, paymentId, amount, SalePaymentApplied.Source.KAFKA);

            if (applied) {
                log.debug("Applied PaymentReceived {} → sale {} (+{}) via Kafka",
                        paymentId, saleId, amount);
            }
            ack.acknowledge();
        } catch (Exception e) {
            log.error("Failed to apply PaymentReceived: {}", e.getMessage(), e);
            // No ack — Kafka will redeliver. DefaultErrorHandler routes to DLT after retries.
            throw new RuntimeException(e);
        }
    }
}
