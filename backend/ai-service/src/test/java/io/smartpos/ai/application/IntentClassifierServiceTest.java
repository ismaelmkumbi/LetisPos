package io.smartpos.ai.application;

import io.smartpos.ai.api.dto.IntentClassification;
import io.smartpos.ai.api.dto.IntentClassification.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class IntentClassifierServiceTest {

    private IntentClassifierService service;

    @BeforeEach
    void setUp() {
        service = new IntentClassifierService();
    }

    // ── Domain classification ──

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
        "what were my sales this month?                   | SALES",
        "show me recent orders                            | SALES",
        "mauzo ya leo                                     | SALES",
        "check stock levels for rice                      | INVENTORY",
        "which items are low in stock?                    | INVENTORY",
        "hisa zangu zikoje?                               | INVENTORY",
        "search products called sugar                     | PRODUCTS",
        "bidhaa gani zinauzwa sana?                       | PRODUCTS",
        "who are my top customers?                        | CUSTOMERS",
        "wateja wangu wa juu                              | CUSTOMERS",
        "what is my profit this month?                    | FINANCE",
        "show expenses for last 30 days                   | FINANCE",
        "malipo ya wafanyakazi                            | HRM",
        "show employee attendance                         | HRM",
        "how do I process a refund?                       | HELP",
        "jinsi ya kurejesha bidhaa                        | HELP",
        "list all tenants with starter plan               | PLATFORM_ADMIN",
        "ni tenant gani amejisajili leo?                  | PLATFORM_ADMIN",
        "hello                                            | GENERAL",
        "habari                                           | GENERAL",
    })
    void classifiesDomainCorrectly(String message, Domain expected) {
        IntentClassification result = service.classify(message);
        assertThat(result.primaryDomain()).isEqualTo(expected);
    }

    // ── Language detection ──

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
        "what were my sales?                              | ENGLISH",
        "show me inventory                                | ENGLISH",
        "naomba kuona mauzo ya leo                        | SWAHILI",
        "ni tenant gani amejisajili leo?                  | SWAHILI",
        "hisa zangu zikoje                                | SWAHILI",
        "nifanyaje kurejesha bidhaa                       | SWAHILI",
        "show me mauzo ya leo                             | MIXED",
    })
    void detectsLanguage(String message, Language expected) {
        IntentClassification result = service.classify(message);
        assertThat(result.language()).isEqualTo(expected);
    }

    // ── Time extraction ──

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
        "sales leo                                       | TODAY",
        "mauzo ya jana                                   | YESTERDAY",
        "what were sales yesterday?                      | YESTERDAY",
        "orders wiki hii                                 | THIS_WEEK",
        "sales this week                                 | THIS_WEEK",
        "revenue mwezi huu                               | THIS_MONTH",
        "profit this month                               | THIS_MONTH",
        "expenses last 30 days                           | LAST_30_DAYS",
        "report siku 30 zilizopita                       | LAST_30_DAYS",
        "sales from 2026-01-01 to 2026-01-31            | CUSTOM",
    })
    void extractsTimeExpression(String message, ResolvedTime.TimeType expected) {
        IntentClassification result = service.classify(message);
        assertThat(result.time().type()).isEqualTo(expected);
    }

    @Test
    void resolvesCustomDateRange() {
        IntentClassification result = service.classify(
            "sales from 2026-01-01 to 2026-01-31");

        assertThat(result.time().type()).isEqualTo(ResolvedTime.TimeType.CUSTOM);
        assertThat(result.time().dateFrom()).isEqualTo("2026-01-01");
        assertThat(result.time().dateTo()).isEqualTo("2026-01-31");
    }

    // ── Write action detection ──

    @ParameterizedTest
    @CsvSource(delimiter = '|', value = {
        "create a purchase order for rice                | true",
        "add new product called sugar                    | true",
        "delete expired batches                          | true",
        "adjust stock for rice to 50 units               | true",
        "tengeneza oda ya mchele                         | true",
        "ongeza bidhaa mpya                              | true",
        "what are my sales?                              | false",
        "show me inventory                               | false",
    })
    void detectsWriteActions(String message, boolean expected) {
        IntentClassification result = service.classify(message);
        assertThat(result.isWriteAction()).isEqualTo(expected);
    }

    // ── Tool narrowing ──

    @Test
    void narrowsToolsByDomain() {
        IntentClassification intent = IntentClassification.of(Domain.SALES, Language.ENGLISH);
        Set<String> allTools = Set.of(
            "getSalesReport", "getTopProducts", "checkStock",
            "getTopCustomers", "getFinancialSummary", "getLowStock",
            "searchProducts", "getRecentSales", "getTenantList"
        );

        Set<String> narrowed = service.narrowTools(intent, allTools);

        assertThat(narrowed).contains("getSalesReport", "getRecentSales");
        assertThat(narrowed).doesNotContain("checkStock", "getLowStock");
    }

    @Test
    void generalIntentReturnsAllTools() {
        IntentClassification intent = IntentClassification.of(Domain.GENERAL, Language.ENGLISH);
        Set<String> allTools = Set.of("getSalesReport", "checkStock");

        Set<String> narrowed = service.narrowTools(intent, allTools);

        assertThat(narrowed).containsExactlyInAnyOrderElementsOf(allTools);
    }

    @Test
    void emptyNarrowReturnsAllTools() {
        IntentClassification intent = IntentClassification.of(Domain.HRM, Language.ENGLISH);
        Set<String> allTools = Set.of("getSalesReport", "checkStock");

        Set<String> narrowed = service.narrowTools(intent, allTools);

        // No HRM tools in the set, should return all as safety
        assertThat(narrowed).containsExactlyInAnyOrderElementsOf(allTools);
    }

    // ── Edge cases ──

    @Test
    void handlesNullMessage() {
        IntentClassification result = service.classify(null);
        assertThat(result.primaryDomain()).isEqualTo(Domain.GENERAL);
        assertThat(result.language()).isEqualTo(Language.ENGLISH);
    }

    @Test
    void handlesEmptyMessage() {
        IntentClassification result = service.classify("");
        assertThat(result.primaryDomain()).isEqualTo(Domain.GENERAL);
    }

    @Test
    void handlesBlankMessage() {
        IntentClassification result = service.classify("   ");
        assertThat(result.primaryDomain()).isEqualTo(Domain.GENERAL);
    }

    @Test
    void extractsKeywords() {
        IntentClassification result = service.classify("show me recent sales for rice in warehouse A");

        assertThat(result.keywords()).contains("show", "recent", "sales", "rice", "warehouse");
    }

    @Test
    void secondaryDomainsDetected() {
        IntentClassification result = service.classify(
            "show sales and check stock levels for warehouse");

        assertThat(result.primaryDomain()).isEqualTo(Domain.INVENTORY);
        assertThat(result.secondaryDomains()).contains(Domain.SALES);
    }

    // ── Swahili time extraction ──

    @Test
    void swahiliToday() {
        IntentClassification result = service.classify("mauzo ya leo");
        assertThat(result.time().type()).isEqualTo(ResolvedTime.TimeType.TODAY);
        assertThat(result.language()).isEqualTo(Language.SWAHILI);
    }

    @Test
    void swahiliYesterday() {
        IntentClassification result = service.classify("mauzo ya jana");
        assertThat(result.time().type()).isEqualTo(ResolvedTime.TimeType.YESTERDAY);
    }

    @Test
    void swahiliThisMonth() {
        IntentClassification result = service.classify("faida ya mwezi huu");
        assertThat(result.time().type()).isEqualTo(ResolvedTime.TimeType.THIS_MONTH);
        assertThat(result.primaryDomain()).isEqualTo(Domain.FINANCE);
    }

    // ── Platform admin detection ──

    @Test
    void platformAdminWithStarterPlan() {
        IntentClassification result = service.classify(
            "list all tenants with starter plan");

        assertThat(result.primaryDomain()).isEqualTo(Domain.PLATFORM_ADMIN);
    }

    @Test
    void platformAdminInSwahili() {
        IntentClassification result = service.classify(
            "ni tenant gani amejisajili leo?");

        assertThat(result.primaryDomain()).isEqualTo(Domain.PLATFORM_ADMIN);
        assertThat(result.language()).isEqualTo(Language.SWAHILI);
        assertThat(result.time().type()).isEqualTo(ResolvedTime.TimeType.TODAY);
    }
}
