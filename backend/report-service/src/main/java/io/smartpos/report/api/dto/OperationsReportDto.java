package io.smartpos.report.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

public record OperationsReportDto(
    List<RegisterSummary> registers,
    List<ShiftSummary> shifts,
    DailyCloseSummary dailyClose
) {
    public record RegisterSummary(UUID terminalId, String terminalName, BigDecimal openingAmount, BigDecimal closingAmount, BigDecimal cashSales, BigDecimal cardSales, BigDecimal expectedCash, BigDecimal difference) {}

    public record ShiftSummary(String shiftName, LocalTime start, LocalTime end, int transactionCount, BigDecimal totalSales, int voidCount) {}

    public record DailyCloseSummary(LocalDate date, BigDecimal totalSales, int totalTransactions, BigDecimal totalVoids, BigDecimal cashToBank, String status) {}
}
