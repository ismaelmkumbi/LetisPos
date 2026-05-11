package io.smartpos.auth.domain.model;

public enum TenantStatus {
    TRIAL,         // 30-day active trial — full features, no payment needed
    TRIAL_EXPIRED, // Trial ended without subscribing — downgraded to FREE plan
    ACTIVE,        // Paid and current
    PAST_DUE,      // Payment failed — 7-day grace period, services still work
    SUSPENDED,     // Account locked — all access blocked, data preserved
    CLOSED         // Permanently closed — data retained 90 days then purged
}
