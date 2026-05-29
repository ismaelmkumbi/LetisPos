package io.smartpos.notification.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record MultiSendRequest(
        @NotEmpty @Valid List<SendRequest> items
) {}
