package io.smartpos.product.api.dto;

import java.util.List;

public record BulkPriceUpdateResponse(int matched, int updated, int errors, List<String> messages) {}
