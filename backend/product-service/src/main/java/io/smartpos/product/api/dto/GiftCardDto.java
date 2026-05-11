package io.smartpos.product.api.dto;

import io.smartpos.product.domain.model.GiftCard;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record GiftCardDto(
        UUID id,
        String cardNumber,
        BigDecimal initialBalance,
        BigDecimal currentBalance,
        LocalDate expiryDate,
        String status,
        UUID customerId,
        UUID purchasedBy
) {
    public static GiftCardDto from(GiftCard g) {
        return new GiftCardDto(g.getId(), g.getCardNumber(),
                g.getInitialBalance(), g.getCurrentBalance(),
                g.getExpiryDate(), g.getStatus(), g.getCustomerId(), g.getPurchasedBy());
    }

    public record IssueRequest(
            @Positive BigDecimal amount,
            LocalDate expiryDate,
            UUID customerId
    ) {}

    public record RedeemRequest(
            @Positive BigDecimal amount,
            String posReference
    ) {}
}
