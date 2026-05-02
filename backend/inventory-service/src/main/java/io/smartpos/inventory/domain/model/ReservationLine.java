package io.smartpos.inventory.domain.model;

import java.math.BigDecimal;
import java.util.UUID;

/** Serialized inside StockReservation.linesJson (JSONB). */
public record ReservationLine(UUID productId, UUID variantId, UUID warehouseId, BigDecimal qty) {}
