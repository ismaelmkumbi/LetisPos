package io.smartpos.report.api.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record RfmSegments(int champions, int loyal, int atRisk, int lost,
                           List<RfmCustomer> customers) {

    public record RfmCustomer(UUID customerId, String customerName,
                               int recency, int frequency, BigDecimal monetary,
                               String segment) {}
}
