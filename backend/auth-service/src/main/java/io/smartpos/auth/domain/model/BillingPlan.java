package io.smartpos.auth.domain.model;

public enum BillingPlan {
    FREE,         // Fallback — trial expired without subscribing. 1 user, 1 store, 100 products.
    STARTER,      // TZS 15K/mo — 5 users, 1 store, 1K products
    BUSINESS,     // TZS 35K/mo — 20 users, 5 stores, 10K products
    PROFESSIONAL, // TZS 79K/mo — 100 users, 25 stores, 50K products
    ENTERPRISE    // TZS 250K/mo — unlimited
}
