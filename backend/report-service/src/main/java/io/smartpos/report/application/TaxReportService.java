package io.smartpos.report.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.report.api.dto.MonthlyTaxBucket;
import io.smartpos.report.api.dto.TaxSummaryDto;
import io.smartpos.report.infrastructure.config.RedisCacheConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.time.Year;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TaxReportService {

    private final JdbcTemplate jdbc;

    @Cacheable(value = RedisCacheConfig.CACHE_PROFIT_LOSS,
               key = "T(io.smartpos.report.infrastructure.config.RedisCacheConfig).tenantKey(#from, #to, 'tax')",
               unless = "#result == null")
    @Transactional(readOnly = true)
    public TaxSummaryDto summary(LocalDate from, LocalDate to) {
        UUID tenantId = TenantContext.require();

        String aggSql = """
            SELECT COALESCE(SUM(f.tax), 0) AS total_tax,
                   COALESCE(SUM(f.net), 0)  AS taxable_sales,
                   COUNT(*)                 AS tx_count
              FROM fact_product_sales_daily f
             WHERE f.tenant_id = ?::uuid
               AND f.date BETWEEN ? AND ?
        """;

        var agg = jdbc.queryForMap(aggSql, tenantId, Date.valueOf(from), Date.valueOf(to));

        String byRateSql = """
            SELECT f.tax_rate, SUM(f.tax) AS tax_amt, SUM(f.net) AS taxable_amt, COUNT(*) AS cnt
              FROM fact_product_sales_daily f
             WHERE f.tenant_id = ?::uuid AND f.date BETWEEN ? AND ?
             GROUP BY f.tax_rate
             ORDER BY tax_amt DESC
        """;

        List<TaxSummaryDto.TaxByRate> byRate = jdbc.query(byRateSql,
                ps -> { ps.setObject(1, tenantId); ps.setObject(2, Date.valueOf(from)); ps.setObject(3, Date.valueOf(to)); },
                (rs, i) -> new TaxSummaryDto.TaxByRate(
                        bd(rs, "tax_rate"), bd(rs, "tax_amt"), bd(rs, "taxable_amt"), rs.getLong("cnt")));

        String byCatSql = """
            SELECT COALESCE(pm.category_name, 'Uncategorised') AS cat,
                   SUM(f.tax) AS tax_amt, SUM(f.net) AS taxable_amt, COUNT(*) AS cnt
              FROM fact_product_sales_daily f
         LEFT JOIN product_meta pm ON pm.product_id = f.product_id
             WHERE f.tenant_id = ?::uuid AND f.date BETWEEN ? AND ?
             GROUP BY pm.category_name
             ORDER BY tax_amt DESC
        """;

        List<TaxSummaryDto.TaxByCategory> byCategory = jdbc.query(byCatSql,
                ps -> { ps.setObject(1, tenantId); ps.setObject(2, Date.valueOf(from)); ps.setObject(3, Date.valueOf(to)); },
                (rs, i) -> new TaxSummaryDto.TaxByCategory(
                        rs.getString("cat"), bd(rs, "tax_amt"), bd(rs, "taxable_amt"), rs.getLong("cnt")));

        return new TaxSummaryDto(from, to,
                bdMap(agg, "total_tax"), bdMap(agg, "taxable_sales"),
                ((Number) agg.get("tx_count")).longValue(),
                byRate, byCategory);
    }

    private static BigDecimal bd(java.sql.ResultSet rs, String col) throws java.sql.SQLException {
        BigDecimal v = rs.getBigDecimal(col);
        return v == null ? BigDecimal.ZERO : v;
    }

    public List<MonthlyTaxBucket> monthlySchedule(int year) {
        // TODO: compute monthly tax schedule from fact tables
        return List.of();
    }

    private static BigDecimal bdMap(java.util.Map<String, Object> m, String k) {
        Object v = m.get(k);
        if (v instanceof BigDecimal bd) return bd;
        if (v instanceof Number n) return BigDecimal.valueOf(n.doubleValue());
        return BigDecimal.ZERO;
    }
}
