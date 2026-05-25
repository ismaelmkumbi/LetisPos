package io.smartpos.ai.application;

import io.smartpos.ai.api.dto.AssistantDtos;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Covers the world-class assistant upgrade:
 *   - Role-aware tool scoping (CASHIER vs TENANT_ADMIN vs PLATFORM_ADMIN)
 *   - teachModule tool routing for how-to questions
 *   - Structured error classification (NO_WAREHOUSE, FORBIDDEN, etc.)
 *   - ModuleGuide coverage of every module
 */
class AssistantIntelligenceUpgradeTest {

    private final IntentClassifierService classifier = new IntentClassifierService();
    private final AssistantToolCatalog catalog = new AssistantToolCatalog(classifier);

    // ── Role scoping ──────────────────────────────────────────────────────

    @Test
    void cashierCannotSeeFinanceOrMarginTools() {
        Set<String> tools = toolNames(jwt(List.of("CASHIER"), "BUSINESS"));
        assertThat(tools).doesNotContain(
            "getFinancialSummary", "getExpenseSummary", "getProductMargins",
            "getStockValuation", "getDeadStock", "getBusinessAnomalies",
            "getTaxSummary", "getDiscountSummary", "getReorderSuggestions");
        // But they keep front-counter tools
        assertThat(tools).contains(
            "checkStockByProductSearch", "searchProducts", "getRecentSales");
    }

    @Test
    void managerKeepsBusinessTools() {
        Set<String> tools = toolNames(jwt(List.of("MANAGER"), "BUSINESS"));
        assertThat(tools).contains(
            "getFinancialSummary", "getStockValuation",
            "getBusinessAnomalies", "getReorderSuggestions");
    }

    @Test
    void tenantAdminDoesNotSeePlatformTools() {
        Set<String> tools = toolNames(jwt(List.of("TENANT_ADMIN"), "ENTERPRISE"));
        assertThat(tools).doesNotContain(
            "getTenantList", "getPlatformStats", "getPlatformSales", "getTenantDetail");
    }

    @Test
    void platformAdminSeesEverything() {
        Set<String> tools = toolNames(jwt(List.of("PLATFORM_ADMIN"), "ENTERPRISE"));
        assertThat(tools).contains(
            "getTenantList", "getPlatformStats", "getPlatformSales",
            "createProduct", "teachModule");
    }

    @Test
    void roleFromJwtPrefersHighestPrivilege() {
        assertThat(RoleProfile.fromJwt(List.of("CASHIER","TENANT_ADMIN","MANAGER")))
            .isEqualTo(RoleProfile.TENANT_ADMIN);
        assertThat(RoleProfile.fromJwt(List.of("PLATFORM_ADMIN","OWNER")))
            .isEqualTo(RoleProfile.PLATFORM_ADMIN);
        assertThat(RoleProfile.fromJwt(List.of())).isEqualTo(RoleProfile.CASHIER);
    }

    // ── Teach module ──────────────────────────────────────────────────────

    @Test
    void teachModuleToolIsRegisteredForAllRoles() {
        assertThat(toolNames(jwt(List.of("CASHIER"), "STARTER"))).contains("teachModule");
        assertThat(toolNames(jwt(List.of("OWNER"), "BUSINESS"))).contains("teachModule");
    }

    @Test
    void moduleGuideCoversEveryAdvertisedModule() {
        List<String> modules = ModuleGuide.listModules();
        assertThat(modules).contains(
            "pos","sales","inventory","products","customers","reports",
            "finance","expenses","payments","documents","notifications",
            "settings","users","warehouses");
        for (String m : modules) {
            ModuleGuide.Guide g = ModuleGuide.lookup(m);
            assertThat(g).as("guide for " + m).isNotNull();
            assertThat(g.steps()).as("steps for " + m).isNotEmpty();
            assertThat(g.summary()).as("summary for " + m).isNotBlank();
            assertThat(g.rolesAllowed()).as("roles for " + m).isNotEmpty();
        }
    }

    @Test
    void moduleGuideLookupIsCaseInsensitiveAndTrims() {
        assertThat(ModuleGuide.lookup("  Inventory  ")).isNotNull();
        assertThat(ModuleGuide.lookup("POS")).isNotNull();
        assertThat(ModuleGuide.lookup("does-not-exist")).isNull();
    }

    // ── Structured errors ─────────────────────────────────────────────────

    @Test
    void classifyMapsMissingWarehouseToNoWarehouse() {
        ToolException te = ToolException.classify("getStockOverview",
            new RuntimeException("Missing required parameter: warehouseId"));
        assertThat(te.code()).isEqualTo("NO_WAREHOUSE");
        assertThat(te.hint()).contains("Settings");
    }

    @Test
    void classifyMaps403ToForbidden() {
        ToolException te = ToolException.classify("adjustStock",
            new RuntimeException("status 403 Forbidden"));
        assertThat(te.code()).isEqualTo("FORBIDDEN");
    }

    @Test
    void classifyMaps404ToNotFound() {
        ToolException te = ToolException.classify("getProductDetail",
            new RuntimeException("404 Not Found"));
        assertThat(te.code()).isEqualTo("NOT_FOUND");
    }

    @Test
    void classifyMaps400ToInvalidArg() {
        ToolException te = ToolException.classify("createProduct",
            new RuntimeException("400 Bad Request: name is required"));
        assertThat(te.code()).isEqualTo("INVALID_ARG");
    }

    @Test
    void classifyMapsConnectionToUpstream() {
        ToolException te = ToolException.classify("getSalesReport",
            new RuntimeException("Connection refused"));
        assertThat(te.code()).isEqualTo("UPSTREAM");
    }

    @Test
    void classifyMapsReadTimedOutToUpstream() {
        ToolException te = ToolException.classify("emailDocument",
            new RuntimeException("Read timed out executing POST http://10.0.0.2:8089/api/v1/notifications"));
        assertThat(te.code()).isEqualTo("UPSTREAM");
    }

    @Test
    void toolErrorRecordCarriesAllFields() {
        AssistantDtos.ToolError err = new AssistantDtos.ToolError(
            "checkStock", "NO_WAREHOUSE", "no warehouse set", "create one");
        assertThat(err.tool()).isEqualTo("checkStock");
        assertThat(err.code()).isEqualTo("NO_WAREHOUSE");
        assertThat(err.message()).isEqualTo("no warehouse set");
        assertThat(err.hint()).isEqualTo("create one");
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private Set<String> toolNames(Jwt jwt) {
        return catalog.scopedTools(jwt).stream()
            .map(AssistantToolCatalog.ToolDef::name)
            .collect(Collectors.toSet());
    }

    private Jwt jwt(List<String> roles, String plan) {
        return Jwt.withTokenValue("test")
            .header("alg", "RS256")
            .claim("sub", "user-1")
            .claim("tenantName", "Test Store")
            .claim("billingPlan", plan)
            .claim("roles", roles)
            .claim("permissions", List.of(
                "product.create","product.update","customer.manage",
                "purchase.create","inventory.adjust","finance.write","notification.send"))
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plusSeconds(3600))
            .build();
    }
}
