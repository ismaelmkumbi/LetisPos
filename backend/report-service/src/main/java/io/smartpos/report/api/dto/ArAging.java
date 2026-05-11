package io.smartpos.report.api.dto;

import java.math.BigDecimal;
import java.util.List;

public record ArAging(List<AgingBucket> buckets, BigDecimal totalOutstanding) {

    public record AgingBucket(String label, int daysFrom, int daysTo,
                               BigDecimal amount, int invoiceCount) {}
}
