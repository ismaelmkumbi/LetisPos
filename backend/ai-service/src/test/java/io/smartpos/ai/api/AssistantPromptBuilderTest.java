package io.smartpos.ai.api;

import io.smartpos.ai.api.dto.AssistantDtos;
import io.smartpos.ai.api.dto.IntentClassification;
import io.smartpos.ai.application.AssistantPromptBuilder;
import io.smartpos.ai.application.TenantMemoryStore;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

class AssistantPromptBuilderTest {

    private final AssistantPromptBuilder builder = new AssistantPromptBuilder(new TenantMemoryStore());

    @Test
    void buildsFrozenPromptWithRoleTone() {
        Jwt jwt = Jwt.withTokenValue("test-token")
            .header("alg", "RS256")
            .claim("sub", "user-123")
            .claim("tenantName", "Test Store")
            .claim("billingPlan", "PROFESSIONAL")
            .claim("roles", List.of("ADMIN"))
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plusSeconds(3600))
            .build();

        String prompt = builder.buildFrozen(jwt, "en");

        assertTrue(prompt.contains("English"));
        assertTrue(prompt.contains("LetisPOS Assistant"));
    }

    @Test
    void buildsDynamicContextWithStoreInfo() {
        Jwt jwt = Jwt.withTokenValue("test-token")
            .header("alg", "RS256")
            .claim("sub", "user-123")
            .claim("tenantName", "Duka Moja")
            .claim("billingPlan", "STARTER")
            .claim("roles", List.of("CASHIER"))
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plusSeconds(3600))
            .build();

        String ctx = builder.buildDynamicContext(jwt, "sw", null, null);

        assertTrue(ctx.contains("Duka Moja"));
        assertTrue(ctx.contains("STARTER"));
        assertTrue(ctx.contains("CASHIER"));
        assertTrue(ctx.contains("Today:"));
    }

    @Test
    void superAdminGetsElevatedFrozenPrompt() {
        Jwt jwt = Jwt.withTokenValue("test-token")
            .header("alg", "RS256")
            .claim("sub", "user-123")
            .claim("tenantName", "Admin Store")
            .claim("billingPlan", "STARTER")
            .claim("roles", List.of("SUPER_ADMIN"))
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plusSeconds(3600))
            .build();

        String prompt = builder.buildFrozen(jwt, "en");

        assertTrue(prompt.contains("SUPER_ADMIN access"));
        assertTrue(prompt.contains("all tenants"));
    }

    @Test
    void handlesNullClaims() {
        Jwt jwt = Jwt.withTokenValue("test-token")
            .header("alg", "RS256")
            .claim("sub", "user-123")
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plusSeconds(3600))
            .build();

        String ctx = builder.buildDynamicContext(jwt, "en", null, null);

        assertTrue(ctx.contains("Unknown"));
        assertTrue(ctx.contains("STARTER"));
        assertTrue(ctx.contains("USER"));
    }

    @Test
    void chatRequestDtosAreValid() {
        AssistantDtos.ChatRequest req = new AssistantDtos.ChatRequest(
            "Hello", "en");
        assertEquals("Hello", req.message());
        assertEquals("en", req.language());
    }

    @Test
    void onboardingContextIncludesPracticalSetupPath() {
        Jwt jwt = Jwt.withTokenValue("test-token")
            .header("alg", "RS256")
            .claim("sub", "user-123")
            .claim("tenantName", "Duka Moja")
            .claim("billingPlan", "STARTER")
            .claim("roles", List.of("TENANT_ADMIN"))
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plusSeconds(3600))
            .build();
        IntentClassification intent = new IntentClassification(
            IntentClassification.Domain.HELP,
            Set.of(),
            IntentClassification.Language.SWAHILI,
            null,
            false,
            List.of("naanza wapi"),
            0.95,
            true,
            false);

        String ctx = builder.buildDynamicContext(jwt, "sw", intent, null);

        assertTrue(ctx.contains("Brand/Store Profile"));
        assertTrue(ctx.contains("Warehouse"));
        assertTrue(ctx.contains("Tax Rules"));
        assertTrue(ctx.contains("POS First Sale"));
        assertTrue(ctx.contains("Utambulisho wa Biashara"));
    }
}
