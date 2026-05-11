package io.smartpos.report.api.dto;

import java.math.BigDecimal;

public record MonthlyTaxBucket(int month, BigDecimal taxableSales, BigDecimal taxCollected,
                                BigDecimal outputTax, BigDecimal inputTax, BigDecimal netPayable) {}
