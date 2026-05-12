package io.smartpos.inventory.application.dto;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

@Data
@Builder
public class ReorderSuggestion {
    private UUID productId;
    private String productName;
    private int currentStock;
    private int suggestedQty;
    private int minQty;
    private UUID supplierId;
    private String urgency; // HIGH, MEDIUM, LOW
    private double dailyVelocity;
    private LocalDate expectedShortageDate;
    private UUID tenantId;
}
