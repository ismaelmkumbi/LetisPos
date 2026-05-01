package io.smartpos.product.api.dto;

import java.util.List;
import java.util.UUID;

public record ImportOpeningStockResponse(
        int total,
        int updated,
        int notFound,
        int errors,
        UUID countId,
        List<String> messages
) {}
