package io.smartpos.payment.api.dto;

import io.smartpos.payment.domain.model.PaymentMethod;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record SupplierPaymentDto(
    UUID paymentId,
    UUID supplierId,
    String supplierName,
    UUID purchaseId,
    String purchaseRef,
    BigDecimal amount,
    String method,
    String reference,
    LocalDate date,
    UUID accountId,
    String accountName
) {
    public record CreateSupplierPaymentRequest(
            @NotNull UUID supplierId,
            @NotNull @DecimalMin("0.0001") BigDecimal amount,
            @NotNull PaymentMethod method,
            @NotNull UUID accountId,
            String reference,
            UUID purchaseId,
            LocalDate date,
            String notes
    ) {}
}
