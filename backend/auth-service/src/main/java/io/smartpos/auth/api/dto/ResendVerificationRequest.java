package io.smartpos.auth.api.dto;

import java.util.UUID;

public record ResendVerificationRequest(
        UUID userId,
        String email
) {}
