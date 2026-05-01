package io.smartpos.sales.api.dto;

import io.smartpos.sales.domain.model.PosTerminal;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public record PosTerminalDto(
        UUID id, String name, String code, UUID warehouseId,
        String pairingToken, UUID cashierUserId, boolean active,
        Instant lastSeenAt, String notes
) {
    public static PosTerminalDto from(PosTerminal t) {
        return new PosTerminalDto(t.getId(), t.getName(), t.getCode(), t.getWarehouseId(),
                t.getPairingToken(), t.getCashierUserId(), t.isActive(),
                t.getLastSeenAt(), t.getNotes());
    }

    public record CreateRequest(
            @NotBlank @Size(max = 120) String name,
            @NotBlank @Size(max = 50) String code,
            @NotNull UUID warehouseId,
            String notes) {}

    /** Customer-display events broadcast over SSE. */
    public record DisplayEvent(
            String type,           // CART_UPDATE | LINE_ADDED | LINE_REMOVED | TOTALS | PAYMENT | CLEAR | MESSAGE
            Object payload,        // free-form (line, totals, message text…)
            Instant ts) {
        public static DisplayEvent of(String type, Object payload) {
            return new DisplayEvent(type, payload, Instant.now());
        }
    }
}
