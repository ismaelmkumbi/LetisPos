package io.smartpos.report.api.dto;

public record RetentionRate(double rate, int returningCustomers, int totalCustomers,
                             double priorPeriodRate, double change) {}
