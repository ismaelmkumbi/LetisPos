package io.smartpos.notification.api.dto;

import io.smartpos.notification.domain.model.Channel;
import io.smartpos.notification.domain.model.NotificationTemplate;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public record TemplateDto(
        UUID id,
        String code,
        Channel channel,
        String name,
        String subject,
        String body,
        boolean html,
        boolean isDefault,
        boolean enabled,
        Instant updatedAt
) {
    public static TemplateDto from(NotificationTemplate t) {
        return new TemplateDto(t.getId(), t.getCode(), t.getChannel(), t.getName(),
                t.getSubject(), t.getBody(), t.isHtml(), t.isDefault(), t.isEnabled(),
                t.getUpdatedAt());
    }

    public record CreateRequest(
            @NotBlank @Size(max = 80)  String code,
            @NotNull  Channel channel,
            @NotBlank @Size(max = 150) String name,
            @Size(max = 255) String subject,
            @NotBlank String body,
            Boolean html,
            Boolean isDefault,
            Boolean enabled
    ) {}

    public record UpdateRequest(
            String name,
            String subject,
            String body,
            Boolean html,
            Boolean isDefault,
            Boolean enabled
    ) {}
}
