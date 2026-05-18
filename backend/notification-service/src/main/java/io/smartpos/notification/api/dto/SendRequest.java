package io.smartpos.notification.api.dto;

import io.smartpos.notification.domain.model.Channel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.Map;
import java.util.UUID;

/**
 * Send a templated notification.
 *
 * Either {@code templateCode} (preferred — uses stored template) OR
 * an inline body via {@code body} (+ optional {@code subject}) must be provided.
 * Template variables are pulled from {@code data} via {{name}} substitution.
 */
public record SendRequest(
        @NotNull Channel channel,
        @NotBlank @Size(max = 255) String recipient,
        String templateCode,
        String subject,
        String body,
        Boolean html,
        Map<String, Object> data,
        String relatedAggregate,
        UUID relatedAggregateId,
        String attachmentBase64,
        String attachmentName
) {}
