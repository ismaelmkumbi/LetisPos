package io.smartpos.hub.api.dto;

import java.util.Map;

public record HeartbeatRequest(
    String server,
    Map<String, Object> metrics,
    String version
) {}
