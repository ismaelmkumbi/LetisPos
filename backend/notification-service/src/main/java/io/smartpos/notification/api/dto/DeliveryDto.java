package io.smartpos.notification.api.dto;

import io.smartpos.notification.domain.model.Channel;
import io.smartpos.notification.domain.model.DeliveryStatus;
import io.smartpos.notification.domain.model.NotificationDelivery;

import java.time.Instant;
import java.util.UUID;

public record DeliveryDto(
        UUID id,
        Channel channel,
        String templateCode,
        String recipient,
        String subject,
        DeliveryStatus status,
        String errorMessage,
        String providerMessageId,
        int attempts,
        String relatedAggregate,
        UUID relatedAggregateId,
        Instant createdAt,
        Instant sentAt,
        Instant nextRetryAt
) {
    public static DeliveryDto from(NotificationDelivery d) {
        return new DeliveryDto(
                d.getId(), d.getChannel(), d.getTemplateCode(), d.getRecipient(),
                d.getSubject(), d.getStatus(), d.getErrorMessage(), d.getProviderMessageId(),
                d.getAttempts(), d.getRelatedAggregate(), d.getRelatedAggregateId(),
                d.getCreatedAt(), d.getSentAt(), d.getNextRetryAt());
    }
}
