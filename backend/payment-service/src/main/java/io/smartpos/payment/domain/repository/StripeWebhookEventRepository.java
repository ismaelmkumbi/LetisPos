package io.smartpos.payment.domain.repository;

import io.smartpos.payment.domain.model.StripeWebhookEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface StripeWebhookEventRepository extends JpaRepository<StripeWebhookEvent, UUID> {
    Optional<StripeWebhookEvent> findByStripeEventId(String stripeEventId);
}
