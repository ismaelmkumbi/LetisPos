package io.smartpos.hub.api.dto;

import java.time.Instant;
import java.util.UUID;

public record AgentResponse(
    UUID id,
    String hostname,
    String ipAddress,
    String version,
    String status,
    Instant lastSeen
) {}
