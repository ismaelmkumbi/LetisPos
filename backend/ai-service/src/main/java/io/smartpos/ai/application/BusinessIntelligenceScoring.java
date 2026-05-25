package io.smartpos.ai.application;

import java.math.BigDecimal;
import java.math.RoundingMode;

final class BusinessIntelligenceScoring {

    private BusinessIntelligenceScoring() {}

    record ConfidenceBand(BigDecimal low, BigDecimal high, double confidence) {}

    static ConfidenceBand poissonDemandBand(BigDecimal observedQty, int observedDays, int forecastDays) {
        double qty = Math.max(0, toDouble(observedQty));
        int days = Math.max(1, observedDays);
        int horizon = Math.max(1, forecastDays);
        double lambda = qty / days * horizon;
        double halfWidth = 1.96 * Math.sqrt(Math.max(lambda, 0.25));
        return new ConfidenceBand(
            bd(Math.max(0, lambda - halfWidth)),
            bd(lambda + halfWidth),
            0.95
        );
    }

    static double stockoutProbability(BigDecimal available, BigDecimal observedQty,
                                      int observedDays, int horizonDays) {
        double stock = Math.max(0, toDouble(available));
        double demand = Math.max(0, toDouble(observedQty));
        int days = Math.max(1, observedDays);
        int horizon = Math.max(1, horizonDays);
        double expectedDemand = demand / days * horizon;
        if (expectedDemand <= 0) return stock <= 0 ? 1.0 : 0.05;
        double z = (expectedDemand - stock) / Math.sqrt(Math.max(expectedDemand, 1.0));
        return clamp(1.0 / (1.0 + Math.exp(-1.35 * z)), 0.01, 0.99);
    }

    static int churnRisk(long transactions30d, BigDecimal spend30d, int daysSinceCreated,
                         boolean active) {
        if (!active) return 100;
        double spend = toDouble(spend30d);
        int age = Math.max(1, daysSinceCreated);
        int risk = 35;
        if (transactions30d == 0) risk += age > 60 ? 45 : 25;
        if (transactions30d >= 3) risk -= 25;
        if (transactions30d >= 8) risk -= 15;
        if (spend > 1_000_000) risk -= 15;
        if (age < 14 && transactions30d <= 1) risk += 10;
        return (int) Math.round(clamp(risk, 0, 100));
    }

    static int vipScore(long transactions30d, BigDecimal spend30d, BigDecimal avgBasket30d,
                        int daysSinceCreated) {
        double spend = toDouble(spend30d);
        double avg = toDouble(avgBasket30d);
        double recencyBoost = daysSinceCreated <= 30 ? 8 : 0;
        double score = Math.min(45, spend / 50_000)
            + Math.min(35, transactions30d * 4)
            + Math.min(12, avg / 50_000)
            + recencyBoost;
        return (int) Math.round(clamp(score, 0, 100));
    }

    static String customerSegment(int vipScore, int churnRisk) {
        if (vipScore >= 75 && churnRisk < 45) return "VIP";
        if (vipScore >= 55 && churnRisk >= 55) return "At-risk VIP";
        if (churnRisk >= 70) return "Churn risk";
        if (vipScore >= 45) return "Growth customer";
        return "Occasional";
    }

    static BigDecimal marginLeakage(BigDecimal price, BigDecimal cost, BigDecimal discount,
                                    BigDecimal qty) {
        BigDecimal unitMargin = nz(price).subtract(nz(cost));
        BigDecimal leakage = nz(discount).multiply(nz(qty).max(BigDecimal.ONE));
        if (unitMargin.compareTo(BigDecimal.ZERO) < 0) {
            leakage = leakage.add(unitMargin.abs().multiply(nz(qty).max(BigDecimal.ONE)));
        }
        return leakage.max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);
    }

    static int marginLeakageScore(BigDecimal price, BigDecimal cost, BigDecimal discount) {
        BigDecimal p = nz(price);
        if (p.compareTo(BigDecimal.ZERO) <= 0) return 0;
        BigDecimal unitMargin = p.subtract(nz(cost));
        double discountPct = nz(discount).divide(p, 4, RoundingMode.HALF_UP).doubleValue();
        double marginPct = unitMargin.divide(p, 4, RoundingMode.HALF_UP).doubleValue();
        double score = discountPct * 120 + Math.max(0, 0.15 - marginPct) * 180;
        if (unitMargin.compareTo(BigDecimal.ZERO) < 0) score += 60;
        return (int) Math.round(clamp(score, 0, 100));
    }

    private static BigDecimal nz(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private static double toDouble(BigDecimal value) {
        return value == null ? 0 : value.doubleValue();
    }

    private static BigDecimal bd(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP);
    }

    private static double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }
}
