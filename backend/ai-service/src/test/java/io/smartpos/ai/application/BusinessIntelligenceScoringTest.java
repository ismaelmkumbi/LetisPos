package io.smartpos.ai.application;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

class BusinessIntelligenceScoringTest {

    @Test
    void stockoutProbabilityRisesWhenStockCannotCoverExpectedDemand() {
        double lowRisk = BusinessIntelligenceScoring.stockoutProbability(
            new BigDecimal("100"), new BigDecimal("30"), 30, 14);
        double highRisk = BusinessIntelligenceScoring.stockoutProbability(
            new BigDecimal("2"), new BigDecimal("30"), 30, 14);

        assertThat(highRisk).isGreaterThan(lowRisk);
        assertThat(highRisk).isGreaterThan(0.80);
    }

    @Test
    void confidenceBandIncludesExpectedDemand() {
        var band = BusinessIntelligenceScoring.poissonDemandBand(
            new BigDecimal("60"), 30, 14);

        assertThat(band.low()).isLessThan(new BigDecimal("28"));
        assertThat(band.high()).isGreaterThan(new BigDecimal("28"));
        assertThat(band.confidence()).isEqualTo(0.95);
    }

    @Test
    void churnAndVipSegmentHighValueRepeatCustomer() {
        int churn = BusinessIntelligenceScoring.churnRisk(
            12, new BigDecimal("2000000"), 180, true);
        int vip = BusinessIntelligenceScoring.vipScore(
            12, new BigDecimal("2000000"), new BigDecimal("166666"), 180);

        assertThat(churn).isLessThan(30);
        assertThat(vip).isGreaterThanOrEqualTo(75);
        assertThat(BusinessIntelligenceScoring.customerSegment(vip, churn)).isEqualTo("VIP");
    }

    @Test
    void churnRiskFlagsInactiveOrDormantCustomer() {
        int inactive = BusinessIntelligenceScoring.churnRisk(
            0, BigDecimal.ZERO, 200, false);
        int dormant = BusinessIntelligenceScoring.churnRisk(
            0, BigDecimal.ZERO, 200, true);

        assertThat(inactive).isEqualTo(100);
        assertThat(dormant).isGreaterThanOrEqualTo(70);
    }

    @Test
    void marginLeakageFlagsDiscountAndNegativeMargin() {
        BigDecimal leakage = BusinessIntelligenceScoring.marginLeakage(
            new BigDecimal("100"), new BigDecimal("120"), new BigDecimal("10"), new BigDecimal("2"));
        int score = BusinessIntelligenceScoring.marginLeakageScore(
            new BigDecimal("100"), new BigDecimal("120"), new BigDecimal("10"));

        assertThat(leakage).isEqualByComparingTo(new BigDecimal("60.00"));
        assertThat(score).isGreaterThanOrEqualTo(70);
    }
}
