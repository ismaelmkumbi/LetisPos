package io.smartpos.sales.api.dto;

import io.smartpos.sales.domain.model.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record RecurringInvoiceDto(
        UUID id,
        String ref,
        String name,
        UUID customerId,
        UUID warehouseId,
        RecurringFrequency frequency,
        int intervalCount,
        LocalDate startDate,
        LocalDate endDate,
        LocalDate nextRunDate,
        LocalDate lastRunDate,
        Integer occurrencesMax,
        int occurrencesCount,
        RecurringStatus status,
        String currency,
        BigDecimal discount,
        BigDecimal shipping,
        TaxMethod taxMethod,
        boolean sendNotification,
        String notes,
        List<LineDto> lines,
        Instant createdAt,
        Instant updatedAt
) {
    public static RecurringInvoiceDto from(RecurringInvoice r) {
        return new RecurringInvoiceDto(
                r.getId(), r.getRef(), r.getName(), r.getCustomerId(), r.getWarehouseId(),
                r.getFrequency(), r.getIntervalCount(),
                r.getStartDate(), r.getEndDate(), r.getNextRunDate(), r.getLastRunDate(),
                r.getOccurrencesMax(), r.getOccurrencesCount(), r.getStatus(),
                r.getCurrency(), r.getDiscount(), r.getShipping(), r.getTaxMethod(),
                r.isSendNotification(), r.getNotes(),
                r.getLines().stream().map(LineDto::from).toList(),
                r.getCreatedAt(), r.getUpdatedAt());
    }

    public record LineDto(
            UUID id, UUID productId, UUID variantId, String productName, String productCode,
            BigDecimal qty, BigDecimal unitPrice,
            BigDecimal discount, DiscountType discountType,
            BigDecimal taxRate, TaxMethod taxMethod, int position
    ) {
        public static LineDto from(RecurringInvoiceLine l) {
            return new LineDto(l.getId(), l.getProductId(), l.getVariantId(),
                    l.getProductNameSnapshot(), l.getProductCodeSnapshot(),
                    l.getQty(), l.getUnitPrice(),
                    l.getDiscount(), l.getDiscountType(),
                    l.getTaxRate(), l.getTaxMethod(), l.getPosition());
        }
    }

    public record CreateRequest(
            @NotBlank @Size(max = 50) String ref,
            String name,
            UUID customerId,
            @NotNull UUID warehouseId,
            @NotNull RecurringFrequency frequency,
            @Min(1) Integer intervalCount,
            @NotNull LocalDate startDate,
            LocalDate endDate,
            Integer occurrencesMax,
            String currency,
            BigDecimal discount,
            BigDecimal shipping,
            TaxMethod taxMethod,
            Boolean sendNotification,
            String notes,
            @NotEmpty @Valid List<LineInput> lines
    ) {}

    public record UpdateRequest(
            String name,
            LocalDate endDate,
            Integer occurrencesMax,
            BigDecimal discount,
            BigDecimal shipping,
            TaxMethod taxMethod,
            Boolean sendNotification,
            String notes,
            @Valid List<LineInput> lines
    ) {}

    public record LineInput(
            @NotNull UUID productId,
            UUID variantId,
            String productName,
            String productCode,
            @NotNull @DecimalMin("0.0001") BigDecimal qty,
            @NotNull @DecimalMin("0.0") BigDecimal unitPrice,
            BigDecimal discount,
            DiscountType discountType,
            BigDecimal taxRate,
            TaxMethod taxMethod,
            Integer position
    ) {}
}
