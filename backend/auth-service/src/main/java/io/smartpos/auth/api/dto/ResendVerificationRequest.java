package io.smartpos.auth.api.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record ResendVerificationRequest(
        @NotNull UUID userId
) {}
