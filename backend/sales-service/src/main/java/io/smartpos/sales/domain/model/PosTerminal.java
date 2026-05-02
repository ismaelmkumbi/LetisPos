package io.smartpos.sales.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.UUID;

/**
 * Registered POS terminal. The {@code pairingToken} is shown on the
 * customer-display screen and entered into the cashier's POS to pair them;
 * once paired, both subscribe to the same SSE stream keyed by terminalId.
 */
@Entity
@Table(name = "pos_terminals")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class PosTerminal {

    private static final SecureRandom RAND = new SecureRandom();
    private static final char[] ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789".toCharArray(); // no I/O/0/1

    @Id @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "name", nullable = false) private String name;
    @Column(name = "code", nullable = false) private String code;
    @Column(name = "warehouse_id", nullable = false) private UUID warehouseId;

    @Column(name = "pairing_token", nullable = false, length = 12)
    private String pairingToken;

    @Column(name = "cashier_user_id") private UUID cashierUserId;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "last_seen_at") private Instant lastSeenAt;
    @Column(name = "notes")        private String notes;
    @Column(name = "tenant_id")    private UUID tenantId;

    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (pairingToken == null) pairingToken = newPairingToken();
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }
    @PreUpdate void onUpdate() { updatedAt = Instant.now(); }

    public static String newPairingToken() {
        char[] out = new char[12];
        for (int i = 0; i < 12; i++) out[i] = ALPHABET[RAND.nextInt(ALPHABET.length)];
        return new String(out);
    }
}
