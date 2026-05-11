package io.smartpos.payment.api.dto;

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
) {}
