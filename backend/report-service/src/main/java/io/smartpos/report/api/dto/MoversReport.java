package io.smartpos.report.api.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record MoversReport(List<MoverRow> top, List<MoverRow> bottom) {

    public record MoverRow(UUID productId, String productName, int qtySold,
                            BigDecimal revenue, String direction) {}
}
