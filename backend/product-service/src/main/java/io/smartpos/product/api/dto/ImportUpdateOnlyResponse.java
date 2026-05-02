package io.smartpos.product.api.dto;

import java.util.List;

public record ImportUpdateOnlyResponse(
        int total,
        int updated,
        int notFound,
        int errors,
        List<String> messages
) {}
