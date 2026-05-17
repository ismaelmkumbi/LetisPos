package io.smartpos.report.api.dto;

import java.time.Instant;

public record DashboardIntelligenceDto(
    String service,
    String version,
    Instant serverTime,
    boolean aiServiceReachable,
    boolean salesServiceReachable,
    boolean inventoryServiceReachable,
    boolean paymentServiceReachable
) {}
