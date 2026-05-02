package io.smartpos.sales.api.dto;

import io.smartpos.sales.domain.model.DiscountType;
import io.smartpos.sales.domain.model.TaxMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.UUID;

/** Common line payload for sales, quotations, drafts, and purchases (price/cost field is reused). */
public record SaleLineInput(
        @NotNull UUID productId,
        UUID variantId,
        String productName,          // snapshot — usually supplied by the client for speed/UX
        String productCode,
        @NotNull @DecimalMin("0.0") BigDecimal unitPrice,
        @NotNull @DecimalMin("0.0001") BigDecimal qty,
        BigDecimal discount,
        DiscountType discountType,
        BigDecimal taxRate,
        TaxMethod taxMethod
) {}
