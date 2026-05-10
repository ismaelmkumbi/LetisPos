package io.smartpos.documents;

import io.smartpos.documents.domain.model.Document;
import io.smartpos.documents.domain.repository.DocumentRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class DocumentGenerationIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("documents_test")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.flyway.enabled", () -> "false");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "create-drop");
        // Provide a dummy JWK set URI so the OAuth2 resource-server auto-config
        // can create a NimbusJwtDecoder bean (it connects lazily, not at startup).
        registry.add("spring.security.oauth2.resourceserver.jwt.jwk-set-uri",
                () -> "http://localhost:9999/.well-known/jwks.json");
    }

    @Autowired
    private DocumentRepository documentRepo;

    @Test
    void shouldPersistDocument() {
        Document doc = Document.builder()
                .tenantId(UUID.randomUUID())
                .documentType("quotation")
                .documentNumber("QUT-000001")
                .status("draft")
                .contentType("application/pdf")
                .sizeBytes(1024L)
                .build();

        Document saved = documentRepo.save(doc);

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getDocumentNumber()).isEqualTo("QUT-000001");
    }

    @Test
    void contextLoads() {
        // Verify Spring context starts with all beans
    }
}
