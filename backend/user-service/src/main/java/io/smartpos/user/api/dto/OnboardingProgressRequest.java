package io.smartpos.user.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record OnboardingProgressRequest(
        @NotBlank String step,
        @NotNull Boolean completed
) {
}
