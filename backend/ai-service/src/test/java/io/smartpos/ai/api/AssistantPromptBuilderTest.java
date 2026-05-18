package io.smartpos.ai.api;

import io.smartpos.ai.api.dto.AssistantDtos;
import io.smartpos.ai.application.AssistantPromptBuilder;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

class AssistantPromptBuilderTest {

    private final AssistantPromptBuilder builder = new AssistantPromptBuilder();

    @Test
    void buildsPromptWithTenantContext() {
        Jwt jwt = Jwt.withTokenValue("test-token")
            .header("alg", "RS256")
            .claim("sub", "user-123")
            .claim("tenantName", "Test Store")
            .claim("billingPlan", "PROFESSIONAL")
            .claim("roles", List.of("ADMIN"))
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plusSeconds(3600))
            .build();

        String prompt = builder.build(jwt, "en");

        assertTrue(prompt.contains("Test Store"));
        assertTrue(prompt.contains("PROFESSIONAL"));
        assertTrue(prompt.contains("ADMIN"));
        assertTrue(prompt.contains("English"));
    }

    @Test
    void buildsPromptInSwahili() {
        Jwt jwt = Jwt.withTokenValue("test-token")
            .header("alg", "RS256")
            .claim("sub", "user-123")
            .claim("tenantName", "Duka Moja")
            .claim("billingPlan", "STARTER")
            .claim("roles", List.of("CASHIER"))
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plusSeconds(3600))
            .build();

        String prompt = builder.build(jwt, "sw");

        assertTrue(prompt.contains("Swahili"));
        assertTrue(prompt.contains("Duka Moja"));
    }

    @Test
    void superAdminGetsElevatedPrompt() {
        Jwt jwt = Jwt.withTokenValue("test-token")
            .header("alg", "RS256")
            .claim("sub", "user-123")
            .claim("tenantName", "Admin Store")
            .claim("billingPlan", "STARTER")
            .claim("roles", List.of("SUPER_ADMIN"))
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plusSeconds(3600))
            .build();

        String prompt = builder.build(jwt, "en");

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

        String prompt = builder.build(jwt, "en");

        assertTrue(prompt.contains("Unknown"));
        assertTrue(prompt.contains("STARTER"));
        assertTrue(prompt.contains("USER"));
    }

    @Test
    void chatRequestDtosAreValid() {
        AssistantDtos.ChatRequest req = new AssistantDtos.ChatRequest(
            "Hello", "en");
        assertEquals("Hello", req.message());
        assertEquals("en", req.language());
    }
}
