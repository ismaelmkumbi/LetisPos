package io.smartpos.ai.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.smartpos.ai.api.dto.IntentClassification;
import org.junit.jupiter.api.DynamicTest;
import org.junit.jupiter.api.TestFactory;
import org.springframework.security.oauth2.jwt.Jwt;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;

class AssistantGoldenEvalTest {

    private static final ObjectMapper OM = new ObjectMapper();
    private final IntentClassifierService classifier = new IntentClassifierService();
    private final AssistantToolCatalog catalog = new AssistantToolCatalog(classifier);

    record Case(String id, String message, String expectedDomain,
                String expectedTool, String language) {}

    @TestFactory
    Stream<DynamicTest> goldenMerchantRoutingCases() throws Exception {
        var resource = getClass().getClassLoader()
            .getResourceAsStream("assistant-evals/golden.jsonl");
        assertThat(resource).as("golden eval resource").isNotNull();

        try (var reader = new BufferedReader(new InputStreamReader(resource, StandardCharsets.UTF_8))) {
            List<Case> cases = reader.lines()
                .filter(line -> !line.isBlank())
                .map(line -> {
                    try { return OM.readValue(line, Case.class); }
                    catch (Exception e) { throw new RuntimeException(e); }
                })
                .toList();

            return cases.stream().map(c -> DynamicTest.dynamicTest(c.id(), () -> {
                IntentClassification intent = classifier.classify(c.message());
                Set<String> tools = catalog.scopedTools(jwt(), c.message()).stream()
                    .map(AssistantToolCatalog.ToolDef::name)
                    .collect(java.util.stream.Collectors.toSet());

                assertThat(intent.primaryDomain().name()).isEqualTo(c.expectedDomain());
                assertThat(intent.language().name()).isEqualTo(c.language());
                assertThat(tools).contains(c.expectedTool());
            }));
        }
    }

    private Jwt jwt() {
        return Jwt.withTokenValue("test-token")
            .header("alg", "RS256")
            .claim("sub", "user-123")
            .claim("tenantName", "Eval Store")
            .claim("billingPlan", "ENTERPRISE")
            .claim("roles", List.of("SUPER_ADMIN", "OWNER"))
            .claim("permissions", List.of(
                "product.create", "product.update", "customer.manage",
                "purchase.create", "inventory.adjust", "finance.write",
                "notification.send", "ai.insight", "ai.chat"))
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plusSeconds(3600))
            .build();
    }
}
