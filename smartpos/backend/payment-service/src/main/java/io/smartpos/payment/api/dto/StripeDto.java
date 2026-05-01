package io.smartpos.payment.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

public class StripeDto {

    public record IntentRequest(
            @NotNull UUID saleId,
            @NotNull @DecimalMin("0.0001") BigDecimal amount,
            String currency,
            @NotNull UUID accountId
    ) {}

    public record IntentResponse(
            String clientSecret,
            String intentId,
            String status
    ) {}
}
