package io.smartpos.ai.application;

import io.smartpos.ai.api.dto.IntentClassification;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

class AssistantIntelligenceSmokeTest {

    private final IntentClassifierService classifier = new IntentClassifierService();
    private final AssistantToolCatalog catalog = new AssistantToolCatalog(classifier);

    @ParameterizedTest(name = "{index}: {0}")
    @MethodSource("merchantConversations")
    void routesTenMerchantConversationsInsideScope(
        String message,
        IntentClassification.Domain expectedDomain,
        String expectedTool
    ) {
        IntentClassification intent = classifier.classify(message);
        Set<String> tools = catalog.scopedTools(jwt(), message).stream()
            .map(AssistantToolCatalog.ToolDef::name)
            .collect(java.util.stream.Collectors.toSet());

        assertThat(intent.primaryDomain()).isEqualTo(expectedDomain);
        assertThat(tools)
            .as("Expected tool routing for: " + message)
            .contains(expectedTool);
    }

    static Stream<org.junit.jupiter.params.provider.Arguments> merchantConversations() {
        return Stream.of(
            args("How are my sales today compared to yesterday?", IntentClassification.Domain.SALES, "getSalesComparison"),
            args("Which items are low in stock right now?", IntentClassification.Domain.INVENTORY, "getLowStock"),
            args("How many Coca Cola 500ml do we have?", IntentClassification.Domain.INVENTORY, "checkStockByProductSearch"),
            args("Show me all products with their current stock", IntentClassification.Domain.PRODUCTS, "getProductInventory"),
            args("Who are my top customers this month?", IntentClassification.Domain.CUSTOMERS, "getTopCustomers"),
            args("What tax did we collect last 30 days?", IntentClassification.Domain.FINANCE, "getTaxSummary"),
            args("Email invoice INV-2026-000002 to the customer", IntentClassification.Domain.SALES, "emailDocument"),
            args("Nionyeshe mauzo ya leo", IntentClassification.Domain.SALES, "getSalesReport"),
            args("How do I process a refund?", IntentClassification.Domain.HELP, "searchDocuments"),
            args("List tenants with starter plan", IntentClassification.Domain.PLATFORM_ADMIN, "getTenantList")
        );
    }

    private static org.junit.jupiter.params.provider.Arguments args(
        String message,
        IntentClassification.Domain domain,
        String tool
    ) {
        return org.junit.jupiter.params.provider.Arguments.of(message, domain, tool);
    }

    private Jwt jwt() {
        return Jwt.withTokenValue("test-token")
            .header("alg", "RS256")
            .claim("sub", "user-123")
            .claim("tenantName", "Smoke Test Store")
            .claim("billingPlan", "ENTERPRISE")
            .claim("roles", List.of("SUPER_ADMIN", "OWNER"))
            .claim("permissions", List.of(
                "product.create",
                "product.update",
                "customer.manage",
                "purchase.create",
                "inventory.adjust",
                "finance.write",
                "notification.send"
            ))
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plusSeconds(3600))
            .build();
    }
}
