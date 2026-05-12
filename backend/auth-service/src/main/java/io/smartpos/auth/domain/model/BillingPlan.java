package io.smartpos.auth.domain.model;

public enum BillingPlan {
    STARTER,      // TZS 15K/mo — 2 users, 1 store, 500 products
    BUSINESS,     // TZS 35K/mo — 5 users, 3 stores, 5K products
    PROFESSIONAL, // TZS 79K/mo — 25 users, 10 stores, 25K products
    ENTERPRISE    // TZS 250K/mo — unlimited
}
