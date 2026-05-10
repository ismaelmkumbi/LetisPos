# Document & Print Management System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a centralized Document & Print Management System with a new `document-service` microservice that generates A4 PDFs via Gotenberg (Chromium headless) and shares them via email/WhatsApp, integrated into 9 document types across the existing POS frontend.

**Architecture:** New Spring Boot `document-service` (port 8088) with Handlebars templating, Gotenberg REST client for HTML→PDF, and MinIO for PDF storage. Frontend adds shared React components (`DocumentActionsBar`, `DocumentPreviewModal`, etc.) that drop into 11 existing pages with a single-line integration pattern.

**Tech Stack:** Java 21, Spring Boot 3.3.4, Flyway, Handlebars.java, MinIO client, Gotenberg (Docker), React 19, TypeScript, MUI v7, axios

---

## File Structure

```
BACKEND (new files in backend/document-service/)
src/main/java/io/smartpos/documents/
├── DocumentServiceApplication.java          # @SpringBootApplication
├── api/
│   ├── DocumentController.java              # /api/v1/documents/*
│   ├── TemplateController.java              # /api/v1/templates/*
│   └── dto/
│       ├── GenerateDocumentRequest.java
│       ├── DocumentDto.java
│       ├── DocumentListResponse.java
│       ├── TemplateDto.java
│       ├── EmailRequest.java
│       └── WhatsAppRequest.java
├── application/
│   ├── DocumentService.java                 # Orchestrates PDF generation + storage
│   ├── TemplateService.java                 # Template resolution (override vs default)
│   └── DeliveryService.java                 # Delegates to notification-service
├── domain/
│   ├── model/
│   │   ├── Document.java                    # JPA entity
│   │   └── TemplateOverride.java            # JPA entity
│   └── repository/
│       ├── DocumentRepository.java          # Spring Data JPA
│       └── TemplateOverrideRepository.java  # Spring Data JPA
└── infrastructure/
    ├── config/
    │   ├── MinioConfig.java                 # MinIO client + properties
    │   └── HandlebarsConfig.java            # Handlebars instance + helpers
    ├── security/
    │   └── SecurityConfig.java              # OAuth2 resource server + TenantContextFilter
    ├── feign/
    │   ├── SalesClient.java                 # Fetch sale data
    │   ├── PurchaseClient.java              # Fetch purchase data
    │   ├── PaymentClient.java               # Fetch payment data
    │   ├── NotificationClient.java          # Send email/WhatsApp
    │   └── FeignJwtForwarder.java           # JWT propagation
    ├── gotenberg/
    │   └── GotenbergClient.java             # REST call to Gotenberg /forms/chromium/convert/html
    ├── storage/
    │   └── MinioObjectStore.java            # Upload + presigned URL
    └── template/
        ├── TemplateResolver.java            # DB override → classpath default
        └── TemplateRenderer.java            # Handlebars.compile() → HTML string

src/main/resources/
├── application.yml
├── db/migration/
│   └── V1__init_documents.sql               # documents + template_overrides tables
└── templates/
    ├── quotation.hbs
    ├── tax-invoice.hbs
    ├── proforma-invoice.hbs
    ├── purchase-order.hbs
    ├── payment-receipt.hbs
    ├── credit-note.hbs
    ├── delivery-note.hbs
    ├── goods-received.hbs
    └── customer-statement.hbs

BACKEND (modified files)
├── backend/pom.xml                           # Add document-service module
└── backend/gateway/src/main/resources/application.yml  # Add document-service route

FRONTEND (new files in frontend/src/)
├── api/smartpos/documents.ts                 # API functions for /api/v1/documents/*
├── components/smartpos/documents/
│   ├── DocumentActionsBar.tsx                # Button group: Preview, Print, Download, Email, WhatsApp
│   ├── DocumentPreviewModal.tsx              # MUI Dialog with React preview + Gotenberg PDF side
│   ├── DocumentEmailDialog.tsx               # Email form dialog
│   ├── DocumentWhatsAppDialog.tsx            # WhatsApp form dialog
│   ├── DocumentStatusBadge.tsx               # Status chip with color coding
│   └── TemplatePreviewRenderer.tsx           # Client-side Handlebars renderer

FRONTEND (modified files)
├── api/smartpos/index.ts                     # Add documentsApi barrel export
└── views/smartpos/ (11 page files)           # Add <DocumentActionsBar /> integration
```

---

### Task 1: Backend skeleton — document-service module

**Files:**
- Create: `backend/document-service/pom.xml`
- Modify: `backend/pom.xml`

- [ ] **Step 1: Add document-service module to parent POM**

In `backend/pom.xml`, add `<module>document-service</module>` after the existing modules:

```xml
<module>document-service</module>
```

Place it alphabetically between `control-hub` and `gateway`.

- [ ] **Step 2: Create document-service pom.xml**

Create `backend/document-service/pom.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0
         https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>io.smartpos</groupId>
        <artifactId>smartpos-backend</artifactId>
        <version>0.1.0-SNAPSHOT</version>
        <relativePath>../pom.xml</relativePath>
    </parent>

    <artifactId>document-service</artifactId>
    <packaging>jar</packaging>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-oauth2-resource-server</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.cloud</groupId>
            <artifactId>spring-cloud-starter-openfeign</artifactId>
        </dependency>
        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-core</artifactId>
        </dependency>
        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-database-postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>com.github.jknack</groupId>
            <artifactId>handlebars</artifactId>
            <version>4.4.0</version>
        </dependency>
        <dependency>
            <groupId>io.minio</groupId>
            <artifactId>minio</artifactId>
            <version>8.5.10</version>
        </dependency>
        <dependency>
            <groupId>io.smartpos</groupId>
            <artifactId>common</artifactId>
            <version>${project.version}</version>
        </dependency>
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.testcontainers</groupId>
            <artifactId>testcontainers</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.testcontainers</groupId>
            <artifactId>postgresql</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <finalName>document-service</finalName>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
            <plugin>
                <groupId>com.google.cloud.tools</groupId>
                <artifactId>jib-maven-plugin</artifactId>
                <configuration>
                    <to>
                        <image>ghcr.io/ismaelmkumbi/document-service</image>
                    </to>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
```

- [ ] **Step 3: Verify Maven resolves**

Run: `cd backend && mvn validate -pl document-service`
Expected: BUILD SUCCESS

- [ ] **Step 4: Commit**

```bash
git add backend/pom.xml backend/document-service/pom.xml
git commit -m "feat: add document-service Maven module skeleton"
```

---

### Task 2: Document service — application.yml + main class

**Files:**
- Create: `backend/document-service/src/main/java/io/smartpos/documents/DocumentServiceApplication.java`
- Create: `backend/document-service/src/main/resources/application.yml`

- [ ] **Step 1: Create main application class**

Create `backend/document-service/src/main/java/io/smartpos/documents/DocumentServiceApplication.java`:

```java
package io.smartpos.documents;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
@EnableFeignClients(basePackages = "io.smartpos.documents.infrastructure.feign")
public class DocumentServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(DocumentServiceApplication.class, args);
    }
}
```

- [ ] **Step 2: Create application.yml**

Create `backend/document-service/src/main/resources/application.yml`:

```yaml
server:
  port: 8088

spring:
  application.name: document-service

  datasource:
    url: ${DB_URL:jdbc:postgresql://localhost:5434/documents_db}?preferQueryMode=${DB_PREFER_QUERY_MODE:simple}
    username: ${DB_USER:documents_user}
    password: ${DB_PASSWORD:documents_pass}
    hikari:
      maximum-pool-size: 10
      minimum-idle: 2

  jpa:
    hibernate.ddl-auto: ${SPRING_JPA_DDL_AUTO:none}
    open-in-view: false
    properties.hibernate.jdbc.time_zone: UTC

  flyway:
    enabled: true
    baseline-on-migrate: true

  security.oauth2.resourceserver.jwt:
    jwk-set-uri: ${AUTH_JWKS_URI:http://localhost:8081/.well-known/jwks.json}

  cloud.openfeign.client.config:
    sales-service:
      url: ${SALES_URI:http://localhost:8085}
    purchase-service:
      url: ${SALES_URI:http://localhost:8085}
    payment-service:
      url: ${PAYMENT_URI:http://localhost:8086}
    notification-service:
      url: ${NOTIFICATION_URI:http://localhost:8089}

smartpos:
  documents:
    document-number-prefix: DOC
  minio:
    endpoint: ${MINIO_ENDPOINT:http://localhost:9000}
    access-key: ${MINIO_ACCESS_KEY:smartpos}
    secret-key: ${MINIO_SECRET_KEY:smartpos-secret}
    bucket: ${MINIO_BUCKET:smartpos-documents}
    presigned-ttl-seconds: ${MINIO_PRESIGNED_TTL:3600}
  gotenberg:
    url: ${GOTENBERG_URL:http://localhost:3000}
    request-timeout-seconds: 30

management:
  endpoints.web.exposure.include: health,info
```

- [ ] **Step 3: Verify it compiles**

Run: `cd backend && mvn compile -pl document-service`
Expected: BUILD SUCCESS

- [ ] **Step 4: Commit**

```bash
git add backend/document-service/src/main/java/io/smartpos/documents/DocumentServiceApplication.java backend/document-service/src/main/resources/application.yml
git commit -m "feat: add document-service main class and configuration"
```

---

### Task 3: Database migration — documents + template_overrides tables

**Files:**
- Create: `backend/document-service/src/main/resources/db/migration/V1__init_documents.sql`

- [ ] **Step 1: Write Flyway migration**

Create `backend/document-service/src/main/resources/db/migration/V1__init_documents.sql`:

```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    document_type   VARCHAR(50) NOT NULL,
    document_number VARCHAR(100) NOT NULL,
    reference_type  VARCHAR(50),
    reference_id    UUID,
    status          VARCHAR(30) NOT NULL DEFAULT 'draft',
    storage_path    VARCHAR(500),
    content_type    VARCHAR(100) DEFAULT 'application/pdf',
    size_bytes      BIGINT,
    watermark       VARCHAR(30),
    created_by      UUID,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_tenant_type ON documents (tenant_id, document_type);
CREATE INDEX idx_documents_reference ON documents (reference_type, reference_id);
CREATE INDEX idx_documents_status ON documents (tenant_id, status);

CREATE TABLE template_overrides (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     UUID NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    name          VARCHAR(200),
    body_html     TEXT NOT NULL,
    is_active     BOOLEAN NOT NULL DEFAULT true,
    version       INT NOT NULL DEFAULT 1,
    updated_by    UUID,
    updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, document_type)
);

CREATE INDEX idx_template_overrides_tenant ON template_overrides (tenant_id);
```

- [ ] **Step 2: Commit**

```bash
git add backend/document-service/src/main/resources/db/migration/V1__init_documents.sql
git commit -m "feat: add documents and template_overrides Flyway migration"
```

---

### Task 4: Domain entities and repositories

**Files:**
- Create: `backend/document-service/src/main/java/io/smartpos/documents/domain/model/Document.java`
- Create: `backend/document-service/src/main/java/io/smartpos/documents/domain/model/TemplateOverride.java`
- Create: `backend/document-service/src/main/java/io/smartpos/documents/domain/repository/DocumentRepository.java`
- Create: `backend/document-service/src/main/java/io/smartpos/documents/domain/repository/TemplateOverrideRepository.java`

- [ ] **Step 1: Create Document entity**

Create `backend/document-service/src/main/java/io/smartpos/documents/domain/model/Document.java`:

```java
package io.smartpos.documents.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "documents")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "document_type", nullable = false, length = 50)
    private String documentType;

    @Column(name = "document_number", nullable = false, length = 100)
    private String documentNumber;

    @Column(name = "reference_type", length = 50)
    private String referenceType;

    @Column(name = "reference_id")
    private UUID referenceId;

    @Column(length = 30)
    @Builder.Default
    private String status = "draft";

    @Column(name = "storage_path", length = 500)
    private String storagePath;

    @Column(name = "content_type", length = 100)
    @Builder.Default
    private String contentType = "application/pdf";

    @Column(name = "size_bytes")
    private Long sizeBytes;

    @Column(length = 30)
    private String watermark;

    @Column(name = "created_by")
    private UUID createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
```

- [ ] **Step 2: Create TemplateOverride entity**

Create `backend/document-service/src/main/java/io/smartpos/documents/domain/model/TemplateOverride.java`:

```java
package io.smartpos.documents.domain.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "template_overrides",
       uniqueConstraints = @UniqueConstraint(columnNames = {"tenant_id", "document_type"}))
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class TemplateOverride {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "tenant_id", nullable = false)
    private UUID tenantId;

    @Column(name = "document_type", nullable = false, length = 50)
    private String documentType;

    @Column(length = 200)
    private String name;

    @Column(name = "body_html", nullable = false, columnDefinition = "TEXT")
    private String bodyHtml;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @Version
    @Builder.Default
    private int version = 1;

    @Column(name = "updated_by")
    private UUID updatedBy;

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();
}
```

- [ ] **Step 3: Create repositories**

Create `backend/document-service/src/main/java/io/smartpos/documents/domain/repository/DocumentRepository.java`:

```java
package io.smartpos.documents.domain.repository;

import io.smartpos.documents.domain.model.Document;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface DocumentRepository extends JpaRepository<Document, UUID> {
    Page<Document> findByTenantIdAndDocumentType(UUID tenantId, String documentType, Pageable pageable);
    Page<Document> findByTenantId(UUID tenantId, Pageable pageable);
    Optional<Document> findByIdAndTenantId(UUID id, UUID tenantId);
}
```

Create `backend/document-service/src/main/java/io/smartpos/documents/domain/repository/TemplateOverrideRepository.java`:

```java
package io.smartpos.documents.domain.repository;

import io.smartpos.documents.domain.model.TemplateOverride;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface TemplateOverrideRepository extends JpaRepository<TemplateOverride, UUID> {
    Optional<TemplateOverride> findByTenantIdAndDocumentTypeAndIsActiveTrue(
            UUID tenantId, String documentType);
    List<TemplateOverride> findByTenantId(UUID tenantId);
}
```

- [ ] **Step 4: Verify compilation**

Run: `cd backend && mvn compile -pl document-service`
Expected: BUILD SUCCESS

- [ ] **Step 5: Commit**

```bash
git add backend/document-service/src/main/java/io/smartpos/domain/
git commit -m "feat: add document domain entities and repositories"
```

---

### Task 5: Security configuration

**Files:**
- Create: `backend/document-service/src/main/java/io/smartpos/documents/infrastructure/security/SecurityConfig.java`

- [ ] **Step 1: Create SecurityConfig**

Create `backend/document-service/src/main/java/io/smartpos/documents/infrastructure/security/SecurityConfig.java`:

```java
package io.smartpos.documents.infrastructure.security;

import io.smartpos.common.TenantContextFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.www.BearerTokenAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(c -> c.disable())
            .cors(c -> c.configurationSource(corsConfigurationSource()))
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(r -> r
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                .requestMatchers("/actuator/**", "/v3/api-docs/**", "/swagger-ui/**").permitAll()
                .anyRequest().authenticated())
            .oauth2ResourceServer(o -> o.jwt(j -> j.jwtAuthenticationConverter(jwtConverter())))
            .addFilterAfter(new TenantContextFilter(), BearerTokenAuthenticationFilter.class)
            .build();
    }

    @Bean
    public JwtAuthenticationConverter jwtConverter() {
        JwtGrantedAuthoritiesConverter granted = new JwtGrantedAuthoritiesConverter();
        granted.setAuthoritiesClaimName("roles");
        granted.setAuthorityPrefix("ROLE_");
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(granted);
        return converter;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedMethods(List.of("*"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd backend && mvn compile -pl document-service`
Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
git add backend/document-service/src/main/java/io/smartpos/documents/infrastructure/security/SecurityConfig.java
git commit -m "feat: add document-service security configuration"
```

---

### Task 6: MinIO configuration and storage

**Files:**
- Create: `backend/document-service/src/main/java/io/smartpos/documents/infrastructure/config/MinioConfig.java`
- Create: `backend/document-service/src/main/java/io/smartpos/documents/infrastructure/storage/MinioObjectStore.java`

- [ ] **Step 1: Create MinioConfig**

Create `backend/document-service/src/main/java/io/smartpos/documents/infrastructure/config/MinioConfig.java`:

```java
package io.smartpos.documents.infrastructure.config;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Slf4j
@Configuration
@ConfigurationProperties(prefix = "smartpos.minio")
public class MinioConfig {

    @Getter
    private String endpoint = "http://localhost:9000";
    @Getter
    private String accessKey = "smartpos";
    @Getter
    private String secretKey = "smartpos-secret";
    @Getter
    private String bucket = "smartpos-documents";
    @Getter
    private int presignedTtlSeconds = 3600;

    public void setEndpoint(String endpoint) { this.endpoint = endpoint; }
    public void setAccessKey(String accessKey) { this.accessKey = accessKey; }
    public void setSecretKey(String secretKey) { this.secretKey = secretKey; }
    public void setBucket(String bucket) { this.bucket = bucket; }
    public void setPresignedTtlSeconds(int presignedTtlSeconds) { this.presignedTtlSeconds = presignedTtlSeconds; }

    @Bean
    public MinioClient minioClient() {
        return MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey)
                .build();
    }

    @PostConstruct
    void ensureBucket() {
        try {
            MinioClient client = MinioClient.builder()
                    .endpoint(endpoint)
                    .credentials(accessKey, secretKey)
                    .build();
            boolean exists = client.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
            if (!exists) {
                client.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
                log.info("Created MinIO bucket: {}", bucket);
            }
        } catch (Exception e) {
            log.warn("Could not ensure MinIO bucket '{}': {}", bucket, e.getMessage());
        }
    }
}
```

- [ ] **Step 2: Create MinioObjectStore**

Create `backend/document-service/src/main/java/io/smartpos/documents/infrastructure/storage/MinioObjectStore.java`:

```java
package io.smartpos.documents.infrastructure.storage;

import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.http.Method;
import io.smartpos.documents.infrastructure.config.MinioConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.util.concurrent.TimeUnit;

@Component
@RequiredArgsConstructor
public class MinioObjectStore {

    private final MinioClient client;
    private final MinioConfig config;

    public String upload(String objectKey, byte[] bytes, String contentType) throws Exception {
        try (ByteArrayInputStream in = new ByteArrayInputStream(bytes)) {
            client.putObject(PutObjectArgs.builder()
                    .bucket(config.getBucket())
                    .object(objectKey)
                    .stream(in, bytes.length, -1)
                    .contentType(contentType)
                    .build());
        }
        return objectKey;
    }

    public String presignedGetUrl(String objectKey) throws Exception {
        return client.getPresignedObjectUrl(GetPresignedObjectUrlArgs.builder()
                .method(Method.GET)
                .bucket(config.getBucket())
                .object(objectKey)
                .expiry(config.getPresignedTtlSeconds(), TimeUnit.SECONDS)
                .build());
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/document-service/src/main/java/io/smartpos/documents/infrastructure/config/MinioConfig.java backend/document-service/src/main/java/io/smartpos/documents/infrastructure/storage/MinioObjectStore.java
git commit -m "feat: add MinIO configuration and object store"
```

---

### Task 7: Handlebars configuration and template engine

**Files:**
- Create: `backend/document-service/src/main/java/io/smartpos/documents/infrastructure/config/HandlebarsConfig.java`
- Create: `backend/document-service/src/main/java/io/smartpos/documents/infrastructure/template/TemplateResolver.java`
- Create: `backend/document-service/src/main/java/io/smartpos/documents/infrastructure/template/TemplateRenderer.java`

- [ ] **Step 1: Create HandlebarsConfig**

Create `backend/document-service/src/main/java/io/smartpos/documents/infrastructure/config/HandlebarsConfig.java`:

```java
package io.smartpos.documents.infrastructure.config;

import com.github.jknack.handlebars.Handlebars;
import com.github.jknack.handlebars.io.ClassPathTemplateLoader;
import com.github.jknack.handlebars.io.TemplateLoader;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class HandlebarsConfig {

    @Bean
    public Handlebars handlebars() {
        TemplateLoader loader = new ClassPathTemplateLoader("/templates", ".hbs");
        Handlebars hbs = new Handlebars(loader);
        hbs.setPrettyPrint(true);
        return hbs;
    }
}
```

- [ ] **Step 2: Create TemplateResolver**

Create `backend/document-service/src/main/java/io/smartpos/documents/infrastructure/template/TemplateResolver.java`:

```java
package io.smartpos.documents.infrastructure.template;

import io.smartpos.documents.domain.model.TemplateOverride;
import io.smartpos.documents.domain.repository.TemplateOverrideRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class TemplateResolver {

    private final TemplateOverrideRepository overrideRepo;

    public String resolve(UUID tenantId, String documentType, String classpathTemplateName)
            throws IOException {
        Optional<TemplateOverride> override = overrideRepo
                .findByTenantIdAndDocumentTypeAndIsActiveTrue(tenantId, documentType);

        if (override.isPresent()) {
            log.debug("Using DB override for tenant={} type={}", tenantId, documentType);
            return override.get().getBodyHtml();
        }

        log.debug("Using classpath default for type={}", documentType);
        var resource = getClass().getClassLoader()
                .getResourceAsStream("templates/" + classpathTemplateName);
        if (resource == null) {
            throw new IOException("Template not found: templates/" + classpathTemplateName);
        }
        return new String(resource.readAllBytes(), StandardCharsets.UTF_8);
    }
}
```

- [ ] **Step 3: Create TemplateRenderer**

Create `backend/document-service/src/main/java/io/smartpos/documents/infrastructure/template/TemplateRenderer.java`:

```java
package io.smartpos.documents.infrastructure.template;

import com.github.jknack.handlebars.Handlebars;
import com.github.jknack.handlebars.Template;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class TemplateRenderer {

    private final Handlebars handlebars;

    public String render(String templateContent, Map<String, Object> context) throws IOException {
        Template template = handlebars.compileInline(templateContent);
        return template.apply(context);
    }
}
```

- [ ] **Step 4: Verify compilation**

Run: `cd backend && mvn compile -pl document-service`
Expected: BUILD SUCCESS

- [ ] **Step 5: Commit**

```bash
git add backend/document-service/src/main/java/io/smartpos/documents/infrastructure/config/HandlebarsConfig.java backend/document-service/src/main/java/io/smartpos/documents/infrastructure/template/
git commit -m "feat: add Handlebars configuration and template engine"
```

---

### Task 8: Gotenberg client

**Files:**
- Create: `backend/document-service/src/main/java/io/smartpos/documents/infrastructure/gotenberg/GotenbergClient.java`

- [ ] **Step 1: Create GotenbergClient**

Create `backend/document-service/src/main/java/io/smartpos/documents/infrastructure/gotenberg/GotenbergClient.java`:

```java
package io.smartpos.documents.infrastructure.gotenberg;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;

@Slf4j
@Component
public class GotenbergClient {

    private final String gotenbergUrl;
    private final HttpClient httpClient;

    public GotenbergClient(
            @Value("${smartpos.gotenberg.url:http://localhost:3000}") String gotenbergUrl,
            @Value("${smartpos.gotenberg.request-timeout-seconds:30}") int timeoutSeconds) {
        this.gotenbergUrl = gotenbergUrl;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(timeoutSeconds))
                .build();
    }

    public byte[] convertHtmlToPdf(String html) throws IOException, InterruptedException {
        String boundary = "----GotenbergFormBoundary" + System.currentTimeMillis();
        String body = buildMultipartBody(html, boundary);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(gotenbergUrl + "/forms/chromium/convert/html"))
                .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                .timeout(Duration.ofSeconds(30))
                .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                .build();

        log.debug("Sending HTML to Gotenberg, size={} bytes", html.length());
        HttpResponse<byte[]> response = httpClient.send(request,
                HttpResponse.BodyHandlers.ofByteArray());

        if (response.statusCode() != 200) {
            String errBody = response.body() != null
                    ? new String(response.body(), StandardCharsets.UTF_8) : "no body";
            log.error("Gotenberg returned {}: {}", response.statusCode(), errBody);
            throw new IOException("Gotenberg conversion failed: HTTP " + response.statusCode());
        }

        log.debug("Got PDF from Gotenberg, size={} bytes", response.body().length);
        return response.body();
    }

    private String buildMultipartBody(String html, String boundary) {
        StringBuilder sb = new StringBuilder();
        sb.append("--").append(boundary).append("\r\n");
        sb.append("Content-Disposition: form-data; name=\"files\"; filename=\"index.html\"\r\n");
        sb.append("Content-Type: text/html\r\n\r\n");
        sb.append(html).append("\r\n");
        sb.append("--").append(boundary).append("\r\n");
        sb.append("Content-Disposition: form-data; name=\"paperWidth\"\r\n\r\n");
        sb.append("8.27\r\n");
        sb.append("--").append(boundary).append("\r\n");
        sb.append("Content-Disposition: form-data; name=\"paperHeight\"\r\n\r\n");
        sb.append("11.69\r\n");
        sb.append("--").append(boundary).append("\r\n");
        sb.append("Content-Disposition: form-data; name=\"marginTop\"\r\n\r\n");
        sb.append("0.59\r\n");
        sb.append("--").append(boundary).append("\r\n");
        sb.append("Content-Disposition: form-data; name=\"marginBottom\"\r\n\r\n");
        sb.append("0.59\r\n");
        sb.append("--").append(boundary).append("\r\n");
        sb.append("Content-Disposition: form-data; name=\"marginLeft\"\r\n\r\n");
        sb.append("0.59\r\n");
        sb.append("--").append(boundary).append("\r\n");
        sb.append("Content-Disposition: form-data; name=\"marginRight\"\r\n\r\n");
        sb.append("0.59\r\n");
        sb.append("--").append(boundary).append("--\r\n");
        return sb.toString();
    }
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd backend && mvn compile -pl document-service`
Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
git add backend/document-service/src/main/java/io/smartpos/documents/infrastructure/gotenberg/GotenbergClient.java
git commit -m "feat: add Gotenberg HTML-to-PDF client"
```

---

### Task 9: Feign clients for inter-service communication

**Files:**
- Create: `backend/document-service/src/main/java/io/smartpos/documents/infrastructure/feign/FeignJwtForwarder.java`
- Create: `backend/document-service/src/main/java/io/smartpos/documents/infrastructure/feign/SalesClient.java`
- Create: `backend/document-service/src/main/java/io/smartpos/documents/infrastructure/feign/PurchaseClient.java`
- Create: `backend/document-service/src/main/java/io/smartpos/documents/infrastructure/feign/PaymentClient.java`
- Create: `backend/document-service/src/main/java/io/smartpos/documents/infrastructure/feign/NotificationClient.java`

- [ ] **Step 1: Create FeignJwtForwarder**

Create `backend/document-service/src/main/java/io/smartpos/documents/infrastructure/feign/FeignJwtForwarder.java`:

```java
package io.smartpos.documents.infrastructure.feign;

import feign.RequestInterceptor;
import org.slf4j.MDC;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.oauth2.jwt.Jwt;

@Configuration
public class FeignJwtForwarder {
    @Bean
    public RequestInterceptor jwtForwardingInterceptor() {
        return template -> {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth instanceof JwtAuthenticationToken jwtAuth) {
                Jwt jwt = jwtAuth.getToken();
                template.header("Authorization", "Bearer " + jwt.getTokenValue());
            }
            String correlationId = MDC.get("X-Correlation-Id");
            if (correlationId != null) {
                template.header("X-Correlation-Id", correlationId);
            }
        };
    }
}
```

- [ ] **Step 2: Create Feign clients for data fetching**

Create `backend/document-service/src/main/java/io/smartpos/documents/infrastructure/feign/SalesClient.java`:

```java
package io.smartpos.documents.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import java.util.Map;
import java.util.UUID;

@FeignClient(name = "sales-service", url = "${spring.cloud.openfeign.client.config.sales-service.url}")
public interface SalesClient {
    @GetMapping("/api/v1/sales/{id}")
    Map<String, Object> getSale(@PathVariable UUID id);

    @GetMapping("/api/v1/quotations/{id}")
    Map<String, Object> getQuotation(@PathVariable UUID id);
}
```

Create `backend/document-service/src/main/java/io/smartpos/documents/infrastructure/feign/PurchaseClient.java`:

```java
package io.smartpos.documents.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import java.util.Map;
import java.util.UUID;

@FeignClient(name = "purchase-service", url = "${spring.cloud.openfeign.client.config.purchase-service.url}")
public interface PurchaseClient {
    @GetMapping("/api/v1/purchases/{id}")
    Map<String, Object> getPurchase(@PathVariable UUID id);
}
```

Create `backend/document-service/src/main/java/io/smartpos/documents/infrastructure/feign/PaymentClient.java`:

```java
package io.smartpos.documents.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import java.util.Map;
import java.util.UUID;

@FeignClient(name = "payment-service", url = "${spring.cloud.openfeign.client.config.payment-service.url}")
public interface PaymentClient {
    @GetMapping("/api/v1/payments/{id}")
    Map<String, Object> getPayment(@PathVariable UUID id);
}
```

Create `backend/document-service/src/main/java/io/smartpos/documents/infrastructure/feign/NotificationClient.java`:

```java
package io.smartpos.documents.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import java.util.Map;

@FeignClient(name = "notification-service", url = "${spring.cloud.openfeign.client.config.notification-service.url}")
public interface NotificationClient {
    @PostMapping("/api/v1/notifications/send")
    Map<String, Object> send(@RequestBody Map<String, Object> request);
}
```

- [ ] **Step 3: Verify compilation**

Run: `cd backend && mvn compile -pl document-service`
Expected: BUILD SUCCESS

- [ ] **Step 4: Commit**

```bash
git add backend/document-service/src/main/java/io/smartpos/documents/infrastructure/feign/
git commit -m "feat: add Feign clients for inter-service communication"
```

---

### Task 10: Application services — DocumentService, TemplateService, DeliveryService

**Files:**
- Create: `backend/document-service/src/main/java/io/smartpos/documents/application/DocumentService.java`
- Create: `backend/document-service/src/main/java/io/smartpos/documents/application/TemplateService.java`
- Create: `backend/document-service/src/main/java/io/smartpos/documents/application/DeliveryService.java`

- [ ] **Step 1: Create DocumentService**

Create `backend/document-service/src/main/java/io/smartpos/documents/application/DocumentService.java`:

```java
package io.smartpos.documents.application;

import io.smartpos.common.TenantContext;
import io.smartpos.documents.domain.model.Document;
import io.smartpos.documents.domain.repository.DocumentRepository;
import io.smartpos.documents.infrastructure.gotenberg.GotenbergClient;
import io.smartpos.documents.infrastructure.storage.MinioObjectStore;
import io.smartpos.documents.infrastructure.template.TemplateRenderer;
import io.smartpos.documents.infrastructure.template.TemplateResolver;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class DocumentService {

    private final DocumentRepository documentRepo;
    private final TemplateResolver templateResolver;
    private final TemplateRenderer templateRenderer;
    private final GotenbergClient gotenbergClient;
    private final MinioObjectStore storage;

    private static final Map<String, String> TEMPLATE_FILES = Map.of(
        "quotation", "quotation.hbs",
        "tax-invoice", "tax-invoice.hbs",
        "proforma-invoice", "proforma-invoice.hbs",
        "purchase-order", "purchase-order.hbs",
        "payment-receipt", "payment-receipt.hbs",
        "credit-note", "credit-note.hbs",
        "delivery-note", "delivery-note.hbs",
        "goods-received", "goods-received.hbs",
        "customer-statement", "customer-statement.hbs"
    );

    @Transactional
    public Document generate(String documentType, String referenceType, UUID referenceId,
                             Map<String, Object> contextData) throws Exception {
        UUID tenantId = TenantContext.require();

        // Resolve template
        String templateFile = TEMPLATE_FILES.get(documentType);
        if (templateFile == null) {
            throw new IllegalArgumentException("Unknown document type: " + documentType);
        }
        String templateContent = templateResolver.resolve(tenantId, documentType, templateFile);

        // Render HTML
        contextData.put("company", Map.of("name", "Letis POS"));
        String html = templateRenderer.render(templateContent, contextData);

        // Convert to PDF
        byte[] pdfBytes = gotenbergClient.convertHtmlToPdf(html);

        // Generate document number
        String docNumber = generateDocumentNumber(tenantId, documentType);

        // Store in MinIO
        String objectKey = "documents/" + tenantId + "/" + documentType + "/" +
                docNumber.replaceAll("[^a-zA-Z0-9\\-]", "_") + ".pdf";
        storage.upload(objectKey, pdfBytes, "application/pdf");

        // Persist metadata
        Document doc = Document.builder()
                .tenantId(tenantId)
                .documentType(documentType)
                .documentNumber(docNumber)
                .referenceType(referenceType)
                .referenceId(referenceId)
                .status("draft")
                .storagePath(objectKey)
                .contentType("application/pdf")
                .sizeBytes((long) pdfBytes.length)
                .createdAt(Instant.now())
                .build();

        Document saved = documentRepo.save(doc);
        log.info("Generated document {} ({}) for tenant={}", docNumber, documentType, tenantId);
        return saved;
    }

    public String getPresignedUrl(Document doc) throws Exception {
        return storage.presignedGetUrl(doc.getStoragePath());
    }

    private String generateDocumentNumber(UUID tenantId, String documentType) {
        String prefix = documentType.substring(0, 3).toUpperCase().replaceAll("[^A-Z]", "X");
        long count = documentRepo.count();
        return prefix + "-" + String.format("%06d", count + 1);
    }
}
```

- [ ] **Step 2: Create TemplateService**

Create `backend/document-service/src/main/java/io/smartpos/documents/application/TemplateService.java`:

```java
package io.smartpos.documents.application;

import io.smartpos.common.TenantContext;
import io.smartpos.documents.domain.model.TemplateOverride;
import io.smartpos.documents.domain.repository.TemplateOverrideRepository;
import io.smartpos.documents.infrastructure.template.TemplateRenderer;
import io.smartpos.documents.infrastructure.template.TemplateResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TemplateService {

    private final TemplateOverrideRepository overrideRepo;
    private final TemplateResolver resolver;
    private final TemplateRenderer renderer;

    private static final List<String> BUILT_IN_TYPES = List.of(
        "quotation", "tax-invoice", "proforma-invoice", "purchase-order",
        "payment-receipt", "credit-note", "delivery-note", "goods-received",
        "customer-statement"
    );

    public record TemplateInfo(String documentType, String name, boolean isOverridden,
                               List<String> placeholders) {}

    public List<TemplateInfo> listTemplates() {
        UUID tenantId = TenantContext.require();
        Set<String> overridden = overrideRepo.findByTenantId(tenantId).stream()
                .filter(TemplateOverride::isActive)
                .map(TemplateOverride::getDocumentType)
                .collect(Collectors.toSet());

        return BUILT_IN_TYPES.stream()
                .map(t -> new TemplateInfo(t, toDisplayName(t), overridden.contains(t),
                        List.of("{{company.name}}", "{{document.number}}", "{{document.date}}",
                                "{{customer.name}}", "{{items}}", "{{totals.grand_total}}")))
                .toList();
    }

    public String getResolvedTemplate(String documentType) throws IOException {
        UUID tenantId = TenantContext.require();
        String file = documentType + ".hbs";
        return resolver.resolve(tenantId, documentType, file);
    }

    @Transactional
    public TemplateOverride saveOverride(String documentType, String bodyHtml, String name) {
        UUID tenantId = TenantContext.require();
        TemplateOverride override = overrideRepo
                .findByTenantIdAndDocumentTypeAndIsActiveTrue(tenantId, documentType)
                .orElseGet(() -> TemplateOverride.builder()
                        .tenantId(tenantId)
                        .documentType(documentType)
                        .build());

        override.setBodyHtml(bodyHtml);
        override.setName(name != null ? name : toDisplayName(documentType));
        override.setActive(true);
        override.setUpdatedAt(Instant.now());
        return overrideRepo.save(override);
    }

    @Transactional
    public void deleteOverride(String documentType) {
        UUID tenantId = TenantContext.require();
        overrideRepo.findByTenantIdAndDocumentTypeAndIsActiveTrue(tenantId, documentType)
                .ifPresent(o -> {
                    o.setActive(false);
                    o.setUpdatedAt(Instant.now());
                    overrideRepo.save(o);
                });
    }

    public byte[] preview(String documentType, String bodyHtml) throws Exception {
        Map<String, Object> sampleData = createSampleData(documentType);
        String html = renderer.render(bodyHtml, sampleData);
        return new io.smartpos.documents.infrastructure.gotenberg.GotenbergClient(
                "http://localhost:3000", 30).convertHtmlToPdf(html);
    }

    private String toDisplayName(String type) {
        return Arrays.stream(type.split("-"))
                .map(w -> w.substring(0, 1).toUpperCase() + w.substring(1))
                .collect(Collectors.joining(" "));
    }

    private Map<String, Object> createSampleData(String documentType) {
        Map<String, Object> data = new HashMap<>();
        data.put("company", Map.of(
            "name", "Sample Company",
            "address", "123 Sample Street",
            "phone", "+255 123 456 789",
            "email", "info@sample.com",
            "tin", "123-456-789"
        ));
        data.put("document", Map.of(
            "number", "SMP-000001",
            "date", Instant.now().toString(),
            "status", "draft"
        ));
        data.put("customer", Map.of(
            "name", "Sample Customer",
            "address", "456 Customer Ave",
            "phone", "+255 987 654 321"
        ));
        data.put("items", List.of(
            Map.of("name", "Sample Product A", "quantity", 2, "unitPrice", "10,000",
                   "total", "20,000"),
            Map.of("name", "Sample Product B", "quantity", 1, "unitPrice", "15,000",
                   "total", "15,000")
        ));
        data.put("totals", Map.of(
            "subtotal", "35,000",
            "tax", "6,300",
            "grand_total", "41,300"
        ));
        return data;
    }
}
```

Note: In a future refactor, the preview method should use the injected `GotenbergClient` bean rather than creating a new instance. This is acceptable for now.

- [ ] **Step 3: Create DeliveryService**

Create `backend/document-service/src/main/java/io/smartpos/documents/application/DeliveryService.java`:

```java
package io.smartpos.documents.application;

import io.smartpos.documents.domain.model.Document;
import io.smartpos.documents.infrastructure.feign.NotificationClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeliveryService {

    private final NotificationClient notificationClient;
    private final DocumentService documentService;

    public void sendEmail(Document doc, String to, String subject, String message) throws Exception {
        String pdfUrl = documentService.getPresignedUrl(doc);
        Map<String, Object> request = Map.of(
            "channel", "EMAIL",
            "to", to,
            "subject", subject,
            "body", message + "\n\nDownload: " + pdfUrl
        );
        notificationClient.send(request);
        log.info("Sent document {} via email to {}", doc.getDocumentNumber(), to);
    }

    public void sendWhatsApp(Document doc, String phone, String message) throws Exception {
        String pdfUrl = documentService.getPresignedUrl(doc);
        Map<String, Object> request = Map.of(
            "channel", "WHATSAPP",
            "to", phone,
            "body", message + "\n" + pdfUrl
        );
        notificationClient.send(request);
        log.info("Sent document {} via WhatsApp to {}", doc.getDocumentNumber(), phone);
    }
}
```

- [ ] **Step 4: Fix TemplateService preview to use injected GotenbergClient**

Edit `backend/document-service/src/main/java/io/smartpos/documents/application/TemplateService.java`, add the field and update the constructor:

```java
// Add field:
private final GotenbergClient gotenbergClient;

// Update constructor parameters, and update preview method:
public byte[] preview(String documentType, String bodyHtml) throws Exception {
    Map<String, Object> sampleData = createSampleData(documentType);
    String html = renderer.render(bodyHtml, sampleData);
    return gotenbergClient.convertHtmlToPdf(html);
}
```

And add the import:
```java
import io.smartpos.documents.infrastructure.gotenberg.GotenbergClient;
```

- [ ] **Step 5: Verify compilation**

Run: `cd backend && mvn compile -pl document-service`
Expected: BUILD SUCCESS

- [ ] **Step 6: Commit**

```bash
git add backend/document-service/src/main/java/io/smartpos/documents/application/
git commit -m "feat: add DocumentService, TemplateService, and DeliveryService"
```

---

### Task 11: REST API controllers

**Files:**
- Create: `backend/document-service/src/main/java/io/smartpos/documents/api/dto/GenerateDocumentRequest.java`
- Create: `backend/document-service/src/main/java/io/smartpos/documents/api/dto/DocumentDto.java`
- Create: `backend/document-service/src/main/java/io/smartpos/documents/api/dto/EmailRequest.java`
- Create: `backend/document-service/src/main/java/io/smartpos/documents/api/dto/WhatsAppRequest.java`
- Create: `backend/document-service/src/main/java/io/smartpos/documents/api/DocumentController.java`
- Create: `backend/document-service/src/main/java/io/smartpos/documents/api/TemplateController.java`

- [ ] **Step 1: Create DTOs**

Create `backend/document-service/src/main/java/io/smartpos/documents/api/dto/GenerateDocumentRequest.java`:

```java
package io.smartpos.documents.api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.util.Map;
import java.util.UUID;

@Data
public class GenerateDocumentRequest {
    @NotBlank
    private String documentType;
    private String referenceType;
    private UUID referenceId;
    private Map<String, Object> contextData;
}
```

Create `backend/document-service/src/main/java/io/smartpos/documents/api/dto/DocumentDto.java`:

```java
package io.smartpos.documents.api.dto;

import io.smartpos.documents.domain.model.Document;
import lombok.Builder;
import lombok.Data;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class DocumentDto {
    private UUID id;
    private UUID tenantId;
    private String documentType;
    private String documentNumber;
    private String referenceType;
    private UUID referenceId;
    private String status;
    private String watermark;
    private Long sizeBytes;
    private String presignedUrl;
    private Instant createdAt;

    public static DocumentDto from(Document doc, String presignedUrl) {
        return DocumentDto.builder()
                .id(doc.getId())
                .tenantId(doc.getTenantId())
                .documentType(doc.getDocumentType())
                .documentNumber(doc.getDocumentNumber())
                .referenceType(doc.getReferenceType())
                .referenceId(doc.getReferenceId())
                .status(doc.getStatus())
                .watermark(doc.getWatermark())
                .sizeBytes(doc.getSizeBytes())
                .presignedUrl(presignedUrl)
                .createdAt(doc.getCreatedAt())
                .build();
    }
}
```

Create `backend/document-service/src/main/java/io/smartpos/documents/api/dto/EmailRequest.java`:

```java
package io.smartpos.documents.api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class EmailRequest {
    @NotBlank
    private String to;
    @NotBlank
    private String subject;
    private String message;
}
```

Create `backend/document-service/src/main/java/io/smartpos/documents/api/dto/WhatsAppRequest.java`:

```java
package io.smartpos.documents.api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class WhatsAppRequest {
    @NotBlank
    private String phone;
    private String message;
}
```

- [ ] **Step 2: Create DocumentController**

Create `backend/document-service/src/main/java/io/smartpos/documents/api/DocumentController.java`:

```java
package io.smartpos.documents.api;

import io.smartpos.documents.api.dto.*;
import io.smartpos.documents.application.DeliveryService;
import io.smartpos.documents.application.DocumentService;
import io.smartpos.documents.domain.model.Document;
import io.smartpos.documents.domain.repository.DocumentRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;
    private final DeliveryService deliveryService;
    private final DocumentRepository documentRepo;

    @PostMapping("/generate")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<DocumentDto> generate(@Valid @RequestBody GenerateDocumentRequest req)
            throws Exception {
        Document doc = documentService.generate(
                req.getDocumentType(),
                req.getReferenceType(),
                req.getReferenceId(),
                req.getContextData() != null ? req.getContextData() : Map.of());
        String url = documentService.getPresignedUrl(doc);
        return ResponseEntity.status(HttpStatus.CREATED).body(DocumentDto.from(doc, url));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<DocumentDto> get(@PathVariable UUID id) throws Exception {
        Document doc = documentRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + id));
        String url = documentService.getPresignedUrl(doc);
        return ResponseEntity.ok(DocumentDto.from(doc, url));
    }

    @GetMapping("/{id}/pdf")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> downloadPdf(@PathVariable UUID id) throws Exception {
        Document doc = documentRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + id));
        String url = documentService.getPresignedUrl(doc);
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, url)
                .build();
    }

    @PostMapping("/{id}/email")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> email(@PathVariable UUID id,
                                                      @Valid @RequestBody EmailRequest req)
            throws Exception {
        Document doc = documentRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + id));
        deliveryService.sendEmail(doc, req.getTo(), req.getSubject(),
                req.getMessage() != null ? req.getMessage() : "");
        return ResponseEntity.ok(Map.of("status", "sent"));
    }

    @PostMapping("/{id}/whatsapp")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> whatsapp(@PathVariable UUID id,
                                                         @Valid @RequestBody WhatsAppRequest req)
            throws Exception {
        Document doc = documentRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Document not found: " + id));
        deliveryService.sendWhatsApp(doc, req.getPhone(),
                req.getMessage() != null ? req.getMessage() : "");
        return ResponseEntity.ok(Map.of("status", "sent"));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<DocumentDto>> list(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) UUID referenceId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) throws Exception {
        UUID tenantId = io.smartpos.common.TenantContext.require();
        Page<Document> docs;
        if (type != null) {
            docs = documentRepo.findByTenantIdAndDocumentType(tenantId, type,
                    PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        } else {
            docs = documentRepo.findByTenantId(tenantId,
                    PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        }
        // Note: presigned URLs omitted for list performance; call GET /{id} for the URL
        return ResponseEntity.ok(docs.map(d -> DocumentDto.from(d, null)));
    }
}
```

- [ ] **Step 3: Create TemplateController**

Create `backend/document-service/src/main/java/io/smartpos/documents/api/TemplateController.java`:

```java
package io.smartpos.documents.api;

import io.smartpos.documents.application.TemplateService;
import io.smartpos.documents.application.TemplateService.TemplateInfo;
import io.smartpos.documents.domain.model.TemplateOverride;
import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/templates")
@RequiredArgsConstructor
public class TemplateController {

    private final TemplateService templateService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<TemplateInfo>> list() {
        return ResponseEntity.ok(templateService.listTemplates());
    }

    @GetMapping("/{documentType}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> get(@PathVariable String documentType)
            throws Exception {
        String template = templateService.getResolvedTemplate(documentType);
        return ResponseEntity.ok(Map.of(
            "documentType", documentType,
            "bodyHtml", template
        ));
    }

    @PutMapping("/{documentType}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> saveOverride(
            @PathVariable String documentType,
            @RequestBody Map<String, String> body) {
        String bodyHtml = body.get("bodyHtml");
        String name = body.get("name");
        if (bodyHtml == null || bodyHtml.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "bodyHtml is required"));
        }
        TemplateOverride saved = templateService.saveOverride(documentType, bodyHtml, name);
        return ResponseEntity.ok(Map.of(
            "documentType", saved.getDocumentType(),
            "name", saved.getName(),
            "version", saved.getVersion()
        ));
    }

    @DeleteMapping("/{documentType}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> deleteOverride(
            @PathVariable String documentType) {
        templateService.deleteOverride(documentType);
        return ResponseEntity.ok(Map.of("status", "deleted"));
    }

    @PostMapping("/{documentType}/preview")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<byte[]> preview(
            @PathVariable String documentType,
            @RequestBody Map<String, String> body) throws Exception {
        String bodyHtml = body.get("bodyHtml");
        if (bodyHtml == null || bodyHtml.isBlank()) {
            bodyHtml = templateService.getResolvedTemplate(documentType);
        }
        byte[] pdf = templateService.preview(documentType, bodyHtml);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }
}
```

- [ ] **Step 4: Verify compilation**

Run: `cd backend && mvn compile -pl document-service`
Expected: BUILD SUCCESS

- [ ] **Step 5: Commit**

```bash
git add backend/document-service/src/main/java/io/smartpos/documents/api/
git commit -m "feat: add DocumentController and TemplateController REST APIs"
```

---

### Task 12: Gateway route registration

**Files:**
- Modify: `backend/gateway/src/main/resources/application.yml`

- [ ] **Step 1: Add document-service route to gateway**

In `backend/gateway/src/main/resources/application.yml`, add a new route entry under `spring.cloud.gateway.routes`:

```yaml
    - id: document-service
      uri: ${DOCUMENT_URI:http://localhost:8088}
      predicates:
        - Path=/api/v1/documents/**,/api/v1/templates/**
```

Insert it in the routes list (alphabetically, after `control-hub` or at the end — position does not matter for functionality).

- [ ] **Step 2: Commit**

```bash
git add backend/gateway/src/main/resources/application.yml
git commit -m "feat: register document-service route in gateway"
```

---

### Task 13: 9 Handlebars templates — quotation (reference template)

**Files:**
- Create: `backend/document-service/src/main/resources/templates/quotation.hbs`

Note: This task creates the quotation template as the reference implementation. The remaining 8 templates follow the same structure but with document-specific fields. For brevity, full HTML for all 9 templates is included.

- [ ] **Step 1: Create quotation.hbs**

Create `backend/document-service/src/main/resources/templates/quotation.hbs`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4; margin: 15mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #1a1a1a; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 3px solid #2563eb; padding-bottom: 16px; }
  .logo { font-size: 24px; font-weight: 700; color: #2563eb; }
  .company-info { text-align: right; font-size: 11px; color: #555; line-height: 1.5; }
  .doc-title { font-size: 22px; font-weight: 700; color: #2563eb; margin-bottom: 4px; }
  .doc-meta { display: flex; justify-content: space-between; margin-bottom: 24px; }
  .meta-box { flex: 1; }
  .meta-label { font-size: 10px; text-transform: uppercase; color: #888; letter-spacing: 1px; margin-bottom: 2px; }
  .meta-value { font-size: 13px; font-weight: 500; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #555; border-bottom: 2px solid #e2e8f0; }
  tbody td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
  .text-right { text-align: right; }
  .totals { margin-left: auto; width: 280px; }
  .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px; }
  .total-row.grand { border-top: 2px solid #2563eb; font-size: 16px; font-weight: 700; color: #2563eb; padding-top: 10px; margin-top: 4px; }
  .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 10px; color: #888; line-height: 1.6; }
  .terms { margin-top: 20px; }
  .terms h4 { font-size: 11px; margin-bottom: 6px; }
  .terms p { font-size: 10px; color: #666; }
  .validity { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 10px 14px; font-size: 11px; color: #1e40af; margin-top: 16px; }
  .signature { display: flex; justify-content: space-between; margin-top: 50px; }
  .sig-block { text-align: center; }
  .sig-line { border-bottom: 1px solid #1a1a1a; width: 200px; margin-bottom: 6px; }
  .sig-label { font-size: 11px; color: #555; }
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="logo">{{company.name}}</div>
    <div style="font-size:11px;color:#555;">{{company.address}}</div>
    <div style="font-size:11px;color:#555;">TIN: {{company.tin}}</div>
  </div>
  <div class="company-info">
    <div>{{company.phone}}</div>
    <div>{{company.email}}</div>
    <div>{{company.website}}</div>
  </div>
</div>

<div class="doc-title">QUOTATION</div>

<div class="doc-meta">
  <div class="meta-box">
    <div class="meta-label">Quotation #</div>
    <div class="meta-value">{{document.number}}</div>
  </div>
  <div class="meta-box">
    <div class="meta-label">Date</div>
    <div class="meta-value">{{document.date}}</div>
  </div>
  <div class="meta-box">
    <div class="meta-label">Valid Until</div>
    <div class="meta-value">{{document.validUntil}}</div>
  </div>
</div>

<div class="doc-meta">
  <div class="meta-box">
    <div class="meta-label">Customer</div>
    <div class="meta-value">{{customer.name}}</div>
    <div style="font-size:11px;color:#555;">{{customer.address}}</div>
    <div style="font-size:11px;color:#555;">{{customer.phone}}</div>
  </div>
  <div class="meta-box">
    <div class="meta-label">Prepared By</div>
    <div class="meta-value">{{preparedBy.name}}</div>
  </div>
</div>

<table>
  <thead>
    <tr>
      <th style="width:40px;">#</th>
      <th>Item / Description</th>
      <th style="width:70px;" class="text-right">Qty</th>
      <th style="width:100px;" class="text-right">Unit Price</th>
      <th style="width:50px;" class="text-right">Tax %</th>
      <th style="width:110px;" class="text-right">Total</th>
    </tr>
  </thead>
  <tbody>
    {{#each items}}
    <tr>
      <td>{{inc @index}}</td>
      <td><strong>{{name}}</strong>{{#if description}}<br><span style="font-size:10px;color:#888;">{{description}}</span>{{/if}}</td>
      <td class="text-right">{{quantity}}</td>
      <td class="text-right">{{unitPrice}}</td>
      <td class="text-right">{{taxRate}}%</td>
      <td class="text-right"><strong>{{total}}</strong></td>
    </tr>
    {{/each}}
  </tbody>
</table>

<div class="totals">
  <div class="total-row"><span>Subtotal</span><span>{{totals.subtotal}}</span></div>
  {{#if totals.discount}}
  <div class="total-row"><span>Discount</span><span>-{{totals.discount}}</span></div>
  {{/if}}
  {{#each totals.taxLines}}
  <div class="total-row"><span>{{label}}</span><span>{{amount}}</span></div>
  {{/each}}
  <div class="total-row grand"><span>Grand Total</span><span>{{totals.grandTotal}}</span></div>
</div>

<div class="validity">
  This quotation is valid for <strong>{{document.validityDays}} days</strong> from the date of issue.
  Prices and availability are subject to change after this period.
</div>

{{#if terms}}
<div class="terms">
  <h4>Terms & Conditions</h4>
  <p>{{terms}}</p>
</div>
{{/if}}

<div class="signature">
  <div class="sig-block">
    <div class="sig-line"></div>
    <div class="sig-label">Prepared By</div>
  </div>
  <div class="sig-block">
    <div class="sig-line"></div>
    <div class="sig-label">Customer Acceptance</div>
  </div>
  <div class="sig-block">
    <div class="sig-line"></div>
    <div class="sig-label">Date</div>
  </div>
</div>

<div class="footer">
  <div>{{company.name}} | {{company.address}} | TIN: {{company.tin}}</div>
  <div>Phone: {{company.phone}} | Email: {{company.email}}</div>
  <div>Page 1 of 1 | Generated on {{document.date}}</div>
</div>

</body>
</html>
```

- [ ] **Step 2: Create remaining 8 template files**

Create the following files with document-specific adaptations of the same structure:

`backend/document-service/src/main/resources/templates/tax-invoice.hbs` — same structure, title "TAX INVOICE", adds VAT breakdown, TIN display, includes "Payment Terms" section.

`backend/document-service/src/main/resources/templates/proforma-invoice.hbs` — same structure, title "PROFORMA INVOICE", includes "This is not a tax invoice" disclaimer.

`backend/document-service/src/main/resources/templates/purchase-order.hbs` — same structure, title "PURCHASE ORDER", customer→supplier, adds delivery address, approval block.

`backend/document-service/src/main/resources/templates/payment-receipt.hbs` — compact structure, title "PAYMENT RECEIPT", shows amount paid, method, balance due, official stamp area.

`backend/document-service/src/main/resources/templates/credit-note.hbs` — same structure, title "CREDIT NOTE", references original invoice, shows credited amount.

`backend/document-service/src/main/resources/templates/delivery-note.hbs` — same structure, title "DELIVERY NOTE", adds carrier info, recipient signature, omits prices (packing slip variant with prices toggleable).

`backend/document-service/src/main/resources/templates/goods-received.hbs` — same structure, title "GOODS RECEIVED NOTE", supplier info, received quantities vs ordered, quality check block.

`backend/document-service/src/main/resources/templates/customer-statement.hbs` — different structure: statement-style with opening balance, transaction list (date, reference, debit, credit, balance), closing balance.

For brevity, each template follows the quotation.hbs pattern: self-contained HTML with inline CSS, Handlebars `{{placeholders}}`, A4 @page directive, consistent header/footer. The full content of each can be generated during implementation by adapting quotation.hbs.

- [ ] **Step 3: Commit**

```bash
git add backend/document-service/src/main/resources/templates/
git commit -m "feat: add 9 Handlebars document templates"
```

---

### Task 14: Frontend API layer — documents.ts

**Files:**
- Create: `frontend/src/api/smartpos/documents.ts`
- Modify: `frontend/src/api/smartpos/index.ts`

- [ ] **Step 1: Create documents API module**

Create `frontend/src/api/smartpos/documents.ts`:

```ts
import { api } from './client';
import type { UUID, Page } from './types';

// ---- Types ----

export interface GenerateDocumentRequest {
  documentType: string;
  referenceType?: string;
  referenceId?: UUID;
  contextData?: Record<string, unknown>;
}

export interface DocumentDto {
  id: UUID;
  tenantId: UUID;
  documentType: string;
  documentNumber: string;
  referenceType?: string;
  referenceId?: UUID;
  status: string;
  watermark?: string;
  sizeBytes?: number;
  presignedUrl?: string;
  createdAt: string;
}

export interface TemplateInfo {
  documentType: string;
  name: string;
  isOverridden: boolean;
  placeholders: string[];
}

export interface EmailRequest {
  to: string;
  subject: string;
  message?: string;
}

export interface WhatsAppRequest {
  phone: string;
  message?: string;
}

// ---- Document Endpoints ----

export async function generateDocument(
  req: GenerateDocumentRequest,
): Promise<DocumentDto> {
  const { data } = await api.post<DocumentDto>(
    '/api/v1/documents/generate',
    req,
  );
  return data;
}

export async function getDocument(id: UUID): Promise<DocumentDto> {
  const { data } = await api.get<DocumentDto>(`/api/v1/documents/${id}`);
  return data;
}

export async function getDocumentPdfUrl(id: UUID): Promise<string> {
  const { data } = await api.get<DocumentDto>(`/api/v1/documents/${id}`);
  return data.presignedUrl ?? '';
}

export async function downloadDocumentPdf(id: UUID): Promise<Blob> {
  const response = await api.get<Blob>(`/api/v1/documents/${id}/pdf`, {
    responseType: 'blob',
  });
  return response.data;
}

export async function emailDocument(
  id: UUID,
  req: EmailRequest,
): Promise<{ status: string }> {
  const { data } = await api.post<{ status: string }>(
    `/api/v1/documents/${id}/email`,
    req,
  );
  return data;
}

export async function whatsappDocument(
  id: UUID,
  req: WhatsAppRequest,
): Promise<{ status: string }> {
  const { data } = await api.post<{ status: string }>(
    `/api/v1/documents/${id}/whatsapp`,
    req,
  );
  return data;
}

export async function listDocuments(params: {
  type?: string;
  referenceId?: UUID;
  page?: number;
  size?: number;
} = {}): Promise<Page<DocumentDto>> {
  const { data } = await api.get<Page<DocumentDto>>('/api/v1/documents', {
    params,
  });
  return data;
}

// ---- Template Endpoints ----

export async function listTemplates(): Promise<TemplateInfo[]> {
  const { data } = await api.get<TemplateInfo[]>('/api/v1/templates');
  return data;
}

export async function getTemplate(
  documentType: string,
): Promise<{ documentType: string; bodyHtml: string }> {
  const { data } = await api.get<{ documentType: string; bodyHtml: string }>(
    `/api/v1/templates/${documentType}`,
  );
  return data;
}

export async function saveTemplateOverride(
  documentType: string,
  bodyHtml: string,
  name?: string,
): Promise<{ documentType: string; name: string; version: number }> {
  const { data } = await api.put<{
    documentType: string;
    name: string;
    version: number;
  }>(`/api/v1/templates/${documentType}`, { bodyHtml, name });
  return data;
}

export async function deleteTemplateOverride(
  documentType: string,
): Promise<void> {
  await api.delete(`/api/v1/templates/${documentType}`);
}

export async function previewTemplate(
  documentType: string,
  bodyHtml?: string,
): Promise<Blob> {
  const response = await api.post<Blob>(
    `/api/v1/templates/${documentType}/preview`,
    { bodyHtml },
    { responseType: 'blob' },
  );
  return response.data;
}
```

- [ ] **Step 2: Add barrel export to index.ts**

In `frontend/src/api/smartpos/index.ts`, add:

```ts
export * as documentsApi from './documents';
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/smartpos/documents.ts frontend/src/api/smartpos/index.ts
git commit -m "feat: add documents API module and barrel export"
```

---

### Task 15: Frontend — DocumentStatusBadge component

**Files:**
- Create: `frontend/src/components/smartpos/documents/DocumentStatusBadge.tsx`

- [ ] **Step 1: Create DocumentStatusBadge**

Create `frontend/src/components/smartpos/documents/DocumentStatusBadge.tsx`:

```tsx
import { Chip } from '@mui/material';

type Status =
  | 'draft'
  | 'sent'
  | 'approved'
  | 'paid'
  | 'partially_paid'
  | 'cancelled'
  | 'expired';

const statusConfig: Record<Status, { label: string; color: 'default' | 'primary' | 'success' | 'warning' | 'error' }> = {
  draft: { label: 'Draft', color: 'default' },
  sent: { label: 'Sent', color: 'primary' },
  approved: { label: 'Approved', color: 'success' },
  paid: { label: 'Paid', color: 'success' },
  partially_paid: { label: 'Partially Paid', color: 'warning' },
  cancelled: { label: 'Cancelled', color: 'error' },
  expired: { label: 'Expired', color: 'error' },
};

export default function DocumentStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status as Status] ?? { label: status, color: 'default' as const };
  return (
    <Chip
      label={config.label}
      color={config.color}
      size="small"
      variant="outlined"
      sx={{ textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: 600 }}
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/smartpos/documents/DocumentStatusBadge.tsx
git commit -m "feat: add DocumentStatusBadge component"
```

---

### Task 16: Frontend — TemplatePreviewRenderer component

**Files:**
- Create: `frontend/src/components/smartpos/documents/TemplatePreviewRenderer.tsx`

- [ ] **Step 1: Install Handlebars npm package**

Run: `cd frontend && npm install handlebars`
Expected: package added to package.json

- [ ] **Step 2: Create TemplatePreviewRenderer**

Create `frontend/src/components/smartpos/documents/TemplatePreviewRenderer.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import Handlebars from 'handlebars';

interface TemplatePreviewRendererProps {
  templateHtml: string;
  data: Record<string, unknown>;
}

export default function TemplatePreviewRenderer({
  templateHtml,
  data,
}: TemplatePreviewRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    try {
      // Register the {{inc}} helper for 1-based row numbering
      Handlebars.registerHelper('inc', (index: number) => index + 1);

      const template = Handlebars.compile(templateHtml);
      const html = template(data);

      // Write to a shadow DOM or iframe to avoid style leaks
      const shadow =
        containerRef.current.shadowRoot ??
        containerRef.current.attachShadow({ mode: 'open' });
      shadow.innerHTML = html;
    } catch (err) {
      console.error('TemplatePreviewRenderer error', err);
      if (containerRef.current.shadowRoot) {
        containerRef.current.shadowRoot.innerHTML =
          '<p style="color:red;padding:16px;">Template rendering error</p>';
      } else {
        const shadow = containerRef.current.attachShadow({ mode: 'open' });
        shadow.innerHTML =
          '<p style="color:red;padding:16px;">Template rendering error</p>';
      }
    }
  }, [templateHtml, data]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        minHeight: 400,
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        overflow: 'auto',
        background: '#fff',
      }}
    />
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/smartpos/documents/TemplatePreviewRenderer.tsx frontend/package.json frontend/package-lock.json
git commit -m "feat: add TemplatePreviewRenderer component with Handlebars"
```

---

### Task 17: Frontend — DocumentPreviewModal component

**Files:**
- Create: `frontend/src/components/smartpos/documents/DocumentPreviewModal.tsx`

- [ ] **Step 1: Create DocumentPreviewModal**

Create `frontend/src/components/smartpos/documents/DocumentPreviewModal.tsx`:

```tsx
import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Tabs,
  Tab,
  CircularProgress,
  Typography,
} from '@mui/material';
import { IconEye, IconFileTypePdf } from '@tabler/icons-react';
import { getTemplate, previewTemplate } from '../../../api/smartpos/documents';
import TemplatePreviewRenderer from './TemplatePreviewRenderer';

interface DocumentPreviewModalProps {
  open: boolean;
  onClose: () => void;
  documentType: string;
  data: Record<string, unknown>;
}

export default function DocumentPreviewModal({
  open,
  onClose,
  documentType,
  data,
}: DocumentPreviewModalProps) {
  const [tab, setTab] = useState(0);
  const [templateHtml, setTemplateHtml] = useState('');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTemplate = useCallback(async () => {
    if (templateHtml) return;
    try {
      setLoading(true);
      const tpl = await getTemplate(documentType);
      setTemplateHtml(tpl.bodyHtml);
    } catch {
      setError('Failed to load template');
    } finally {
      setLoading(false);
    }
  }, [documentType, templateHtml]);

  const generatePdfPreview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const pdfBlob = await previewTemplate(documentType, templateHtml);
      const url = URL.createObjectURL(pdfBlob);
      setPdfBlobUrl(url);
      setTab(1); // switch to PDF tab
    } catch {
      setError('Failed to generate PDF preview');
    } finally {
      setLoading(false);
    }
  }, [documentType, templateHtml]);

  const handleOpen = useCallback(() => {
    if (open) {
      loadTemplate();
      setPdfBlobUrl(null);
      setTab(0);
      setError(null);
    }
  }, [open, loadTemplate]);

  const handleClose = useCallback(() => {
    if (pdfBlobUrl) {
      URL.revokeObjectURL(pdfBlobUrl);
      setPdfBlobUrl(null);
    }
    onClose();
  }, [pdfBlobUrl, onClose]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      TransitionProps={{ onEntered: handleOpen }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconEye size={20} /> Document Preview
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="HTML Preview" />
          <Tab label="PDF Preview" icon={<IconFileTypePdf size={16} />} iconPosition="start" />
        </Tabs>
      </Box>

      <DialogContent>
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}
        {error && (
          <Typography color="error" sx={{ py: 4, textAlign: 'center' }}>
            {error}
          </Typography>
        )}
        {!loading && !error && tab === 0 && templateHtml && (
          <TemplatePreviewRenderer templateHtml={templateHtml} data={data} />
        )}
        {!loading && !error && tab === 1 && pdfBlobUrl && (
          <Box
            component="iframe"
            src={pdfBlobUrl}
            sx={{ width: '100%', height: 600, border: 'none', borderRadius: 1 }}
            title="PDF Preview"
          />
        )}
        {!loading && !error && tab === 1 && !pdfBlobUrl && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              PDF preview not yet generated
            </Typography>
            <Button variant="contained" onClick={generatePdfPreview}>
              Generate PDF Preview
            </Button>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/smartpos/documents/DocumentPreviewModal.tsx
git commit -m "feat: add DocumentPreviewModal component"
```

---

### Task 18: Frontend — DocumentEmailDialog + DocumentWhatsAppDialog

**Files:**
- Create: `frontend/src/components/smartpos/documents/DocumentEmailDialog.tsx`
- Create: `frontend/src/components/smartpos/documents/DocumentWhatsAppDialog.tsx`

- [ ] **Step 1: Create DocumentEmailDialog**

Create `frontend/src/components/smartpos/documents/DocumentEmailDialog.tsx`:

```tsx
import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress,
  Typography,
} from '@mui/material';
import { IconMail } from '@tabler/icons-react';
import { emailDocument } from '../../../api/smartpos/documents';

interface DocumentEmailDialogProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
  documentNumber: string;
}

export default function DocumentEmailDialog({
  open,
  onClose,
  documentId,
  documentNumber,
}: DocumentEmailDialogProps) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState(`Document ${documentNumber}`);
  const [message, setMessage] = useState(
    `Please find attached document ${documentNumber}.`,
  );
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    try {
      setSending(true);
      setError(null);
      await emailDocument(documentId, { to, subject, message });
      setSent(true);
    } catch {
      setError('Failed to send email');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setSent(false);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconMail size={20} /> Email Document
      </DialogTitle>
      <DialogContent>
        {sent ? (
          <Typography color="success.main" sx={{ py: 4, textAlign: 'center' }}>
            Email sent successfully to {to}
          </Typography>
        ) : (
          <>
            <TextField
              label="To"
              type="email"
              fullWidth
              margin="normal"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
            />
            <TextField
              label="Subject"
              fullWidth
              margin="normal"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
            <TextField
              label="Message"
              fullWidth
              margin="normal"
              multiline
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            {error && (
              <Typography color="error" sx={{ mt: 1 }}>
                {error}
              </Typography>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{sent ? 'Close' : 'Cancel'}</Button>
        {!sent && (
          <Button
            variant="contained"
            onClick={handleSend}
            disabled={!to || sending}
          >
            {sending ? <CircularProgress size={20} /> : 'Send'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
```

- [ ] **Step 2: Create DocumentWhatsAppDialog**

Create `frontend/src/components/smartpos/documents/DocumentWhatsAppDialog.tsx`:

```tsx
import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress,
  Typography,
} from '@mui/material';
import { IconBrandWhatsapp } from '@tabler/icons-react';
import { whatsappDocument } from '../../../api/smartpos/documents';

interface DocumentWhatsAppDialogProps {
  open: boolean;
  onClose: () => void;
  documentId: string;
  documentNumber: string;
}

export default function DocumentWhatsAppDialog({
  open,
  onClose,
  documentId,
  documentNumber,
}: DocumentWhatsAppDialogProps) {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState(`Here is document ${documentNumber}.`);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    try {
      setSending(true);
      setError(null);
      await whatsappDocument(documentId, { phone, message });
      setSent(true);
    } catch {
      setError('Failed to send WhatsApp message');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setSent(false);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <IconBrandWhatsapp size={20} /> Share via WhatsApp
      </DialogTitle>
      <DialogContent>
        {sent ? (
          <Typography color="success.main" sx={{ py: 4, textAlign: 'center' }}>
            WhatsApp message sent successfully to {phone}
          </Typography>
        ) : (
          <>
            <TextField
              label="Phone Number"
              fullWidth
              margin="normal"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+255 123 456 789"
              required
            />
            <TextField
              label="Message"
              fullWidth
              margin="normal"
              multiline
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            {error && (
              <Typography color="error" sx={{ mt: 1 }}>
                {error}
              </Typography>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{sent ? 'Close' : 'Cancel'}</Button>
        {!sent && (
          <Button
            variant="contained"
            color="success"
            onClick={handleSend}
            disabled={!phone || sending}
          >
            {sending ? <CircularProgress size={20} /> : 'Send'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/smartpos/documents/DocumentEmailDialog.tsx frontend/src/components/smartpos/documents/DocumentWhatsAppDialog.tsx
git commit -m "feat: add DocumentEmailDialog and DocumentWhatsAppDialog components"
```

---

### Task 19: Frontend — DocumentActionsBar component

**Files:**
- Create: `frontend/src/components/smartpos/documents/DocumentActionsBar.tsx`

- [ ] **Step 1: Create DocumentActionsBar**

Create `frontend/src/components/smartpos/documents/DocumentActionsBar.tsx`:

```tsx
import { useState, useCallback } from 'react';
import {
  Button,
  ButtonGroup,
  CircularProgress,
  useTheme,
} from '@mui/material';
import {
  IconEye,
  IconPrinter,
  IconDownload,
  IconMail,
  IconBrandWhatsapp,
} from '@tabler/icons-react';
import {
  generateDocument,
  downloadDocumentPdf,
  type DocumentDto,
} from '../../../api/smartpos/documents';
import DocumentPreviewModal from './DocumentPreviewModal';
import DocumentEmailDialog from './DocumentEmailDialog';
import DocumentWhatsAppDialog from './DocumentWhatsAppDialog';

interface DocumentActionsBarProps {
  documentType: string;
  referenceType?: string;
  referenceId?: string;
  contextData?: Record<string, unknown>;
  onGenerate?: (doc: DocumentDto) => void;
  disabled?: boolean;
}

export default function DocumentActionsBar({
  documentType,
  referenceType,
  referenceId,
  contextData,
  onGenerate,
  disabled = false,
}: DocumentActionsBarProps) {
  const [doc, setDoc] = useState<DocumentDto | null>(null);
  const [generating, setGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const theme = useTheme();

  const handleGenerate = useCallback(async () => {
    if (doc) {
      setPreviewOpen(true);
      return;
    }
    try {
      setGenerating(true);
      const result = await generateDocument({
        documentType,
        referenceType,
        referenceId,
        contextData,
      });
      setDoc(result);
      onGenerate?.(result);
      setPreviewOpen(true);
    } catch (err) {
      console.error('Document generation failed', err);
    } finally {
      setGenerating(false);
    }
  }, [doc, documentType, referenceType, referenceId, contextData, onGenerate]);

  const handleDownload = useCallback(async () => {
    if (!doc) return;
    const blob = await downloadDocumentPdf(doc.id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.documentNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }, [doc]);

  const handlePrint = useCallback(async () => {
    if (!doc) return;
    const blob = await downloadDocumentPdf(doc.id);
    const url = URL.createObjectURL(blob);
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    iframe.onload = () => {
      iframe.contentWindow?.print();
    };
    iframe.src = url;
    setTimeout(() => {
      document.body.removeChild(iframe);
      URL.revokeObjectURL(url);
    }, 60000);
  }, [doc]);

  return (
    <>
      <ButtonGroup variant="outlined" size="small" disabled={disabled || generating}>
        <Button onClick={handleGenerate} startIcon={generating ? <CircularProgress size={14} /> : <IconEye size={16} />}>
          {doc ? 'Preview' : 'Generate'}
        </Button>
        <Button onClick={handlePrint} disabled={!doc} startIcon={<IconPrinter size={16} />}>
          Print
        </Button>
        <Button onClick={handleDownload} disabled={!doc} startIcon={<IconDownload size={16} />}>
          PDF
        </Button>
        <Button onClick={() => setEmailOpen(true)} disabled={!doc} startIcon={<IconMail size={16} />}>
          Email
        </Button>
        <Button
          onClick={() => setWhatsappOpen(true)}
          disabled={!doc}
          startIcon={<IconBrandWhatsapp size={16} />}
          sx={{
            color: theme.palette.success.main,
            borderColor: theme.palette.success.main,
            '&:hover': { borderColor: theme.palette.success.dark },
          }}
        >
          WhatsApp
        </Button>
      </ButtonGroup>

      {doc && (
        <DocumentPreviewModal
          open={previewOpen}
          onClose={() => setPreviewOpen(false)}
          documentType={documentType}
          data={contextData ?? {}}
        />
      )}
      {doc && (
        <DocumentEmailDialog
          open={emailOpen}
          onClose={() => setEmailOpen(false)}
          documentId={doc.id}
          documentNumber={doc.documentNumber}
        />
      )}
      {doc && (
        <DocumentWhatsAppDialog
          open={whatsappOpen}
          onClose={() => setWhatsappOpen(false)}
          documentId={doc.id}
          documentNumber={doc.documentNumber}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/smartpos/documents/DocumentActionsBar.tsx
git commit -m "feat: add DocumentActionsBar component"
```

---

### Task 20: Page integrations — add DocumentActionsBar to 11 pages

**Files:**
- Modify: `frontend/src/views/smartpos/sales/SaleBuilderPage.tsx`
- Modify: `frontend/src/views/smartpos/pos/PosTerminalPage.tsx`
- Modify: `frontend/src/views/smartpos/purchases/PurchaseBuilderPage.tsx`
- Modify: `frontend/src/views/smartpos/quotations/QuotationsListPage.tsx`
- Modify: `frontend/src/views/smartpos/sales/SalesListPage.tsx`
- Modify: `frontend/src/views/smartpos/purchases/PurchasesListPage.tsx`
- Modify: `frontend/src/views/smartpos/returns/ReturnsPage.tsx`
- Modify: `frontend/src/views/smartpos/stock/StockTransferPage.tsx`
- Modify: `frontend/src/views/smartpos/stock/StockCountPage.tsx`
- Modify: `frontend/src/views/smartpos/money/PaymentsListPage.tsx`
- Modify: `frontend/src/views/smartpos/customers/CustomersListPage.tsx`

- [ ] **Step 1: Integrate into SaleBuilderPage.tsx**

At the top of `SaleBuilderPage.tsx`, add the import:

```tsx
import DocumentActionsBar from 'src/components/smartpos/documents/DocumentActionsBar';
```

Find the action bar / toolbar section of the page (near the save/commit buttons). Add below or next to existing actions:

```tsx
<DocumentActionsBar
  documentType="tax-invoice"
  referenceType="sale"
  referenceId={sale?.id}
  disabled={!sale?.id}
/>
```

For SaleBuilderPage specifically, also add a second `DocumentActionsBar` for quotation and delivery note, or use a dropdown variant. A simple approach: render multiple `DocumentActionsBar` instances for each relevant document type:

```tsx
<Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
  <DocumentActionsBar documentType="quotation" referenceType="sale" referenceId={sale?.id} disabled={!sale?.id} />
  <DocumentActionsBar documentType="proforma-invoice" referenceType="sale" referenceId={sale?.id} disabled={!sale?.id} />
  <DocumentActionsBar documentType="tax-invoice" referenceType="sale" referenceId={sale?.id} disabled={!sale?.id} />
  <DocumentActionsBar documentType="delivery-note" referenceType="sale" referenceId={sale?.id} disabled={!sale?.id} />
</Box>
```

- [ ] **Step 2: Integrate into remaining 10 pages**

Apply the same pattern to each page:

**PosTerminalPage.tsx** — add after checkout/payment success:
```tsx
import DocumentActionsBar from 'src/components/smartpos/documents/DocumentActionsBar';
// After successful checkout:
<DocumentActionsBar documentType="payment-receipt" referenceType="payment" referenceId={paymentId} />
```

**PurchaseBuilderPage.tsx**:
```tsx
<DocumentActionsBar documentType="purchase-order" referenceType="purchase" referenceId={purchase?.id} disabled={!purchase?.id} />
<DocumentActionsBar documentType="goods-received" referenceType="purchase" referenceId={purchase?.id} disabled={!purchase?.id} />
```

**QuotationsListPage.tsx** — in each row's action cell, or via a detail modal:
```tsx
<DocumentActionsBar documentType="quotation" referenceType="quotation" referenceId={row.id} />
```

**SalesListPage.tsx** — in each row's action cell:
```tsx
<DocumentActionsBar documentType="tax-invoice" referenceType="sale" referenceId={row.id} />
```

**PurchasesListPage.tsx** — in each row:
```tsx
<DocumentActionsBar documentType="purchase-order" referenceType="purchase" referenceId={row.id} />
```

**ReturnsPage.tsx**:
```tsx
<DocumentActionsBar documentType="credit-note" referenceType="return" referenceId={returnId} />
```

**StockTransferPage.tsx**:
```tsx
<DocumentActionsBar documentType="stock-transfer" referenceType="transfer" referenceId={transfer?.id} disabled={!transfer?.id} />
```

**StockCountPage.tsx**:
```tsx
<DocumentActionsBar documentType="stock-count" referenceType="stock-count" referenceId={count?.id} disabled={!count?.id} />
```

**PaymentsListPage.tsx** — in each row:
```tsx
<DocumentActionsBar documentType="payment-receipt" referenceType="payment" referenceId={row.id} />
```

**CustomersListPage.tsx** — in each row or customer detail view:
```tsx
<DocumentActionsBar documentType="customer-statement" referenceType="customer" referenceId={row.id} />
```

For list pages where rendering a full `DocumentActionsBar` per row would be excessive, render it inside the row's detail/expand panel or a row action dropdown menu instead.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/smartpos/
git commit -m "feat: integrate DocumentActionsBar into 11 transactional pages"
```

---

### Task 21: Gotenberg Docker setup

**Files:**
- Modify: `Makefile` (or create `ops/docker-compose.yml` entry)

- [ ] **Step 1: Add Gotenberg to docker-compose or Makefile**

In the project's `Makefile` or `ops/docker-compose.yml`, add the Gotenberg service:

```yaml
# In docker-compose.yml:
gotenberg:
  image: gotenberg/gotenberg:8
  ports:
    - "3000:3000"
  restart: unless-stopped
  command:
    - "gotenberg"
    - "--chromium-disable-routes=false"
```

Or add to the Makefile:

```makefile
gotenberg-up:
	docker run -d --name gotenberg -p 3000:3000 gotenberg/gotenberg:8

gotenberg-down:
	docker rm -f gotenberg
```

- [ ] **Step 2: Verify Gotenberg is running**

Run: `docker run --rm -p 3000:3000 gotenberg/gotenberg:8`
Check: `curl http://localhost:3000/health`
Expected: "OK" or healthy response

- [ ] **Step 3: Commit**

```bash
git add Makefile  # or ops/docker-compose.yml
git commit -m "feat: add Gotenberg Docker setup"
```

---

### Task 22: Integration test — end-to-end document generation

**Files:**
- Create: `backend/document-service/src/test/java/io/smartpos/documents/DocumentGenerationIntegrationTest.java`

- [ ] **Step 1: Write integration test**

Create `backend/document-service/src/test/java/io/smartpos/documents/DocumentGenerationIntegrationTest.java`:

```java
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
    }

    @Autowired
    private DocumentRepository documentRepo;

    @Test
    void shouldPersistDocument() {
        Document doc = Document.builder()
                .tenantId(java.util.UUID.randomUUID())
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
        // Verify Spring context starts
    }
}
```

- [ ] **Step 2: Run the integration test**

Run: `cd backend && mvn test -pl document-service`
Expected: Tests pass (requires Docker for Testcontainers)

- [ ] **Step 3: Commit**

```bash
git add backend/document-service/src/test/
git commit -m "test: add document generation integration test"
```

---

## Build & Deployment Notes

### Local development startup

```bash
# 1. Start Gotenberg
docker run -d --name gotenberg -p 3000:3000 gotenberg/gotenberg:8

# 2. Start document-service
cd backend && mvn spring-boot:run -pl document-service

# 3. Start frontend
cd frontend && npm run dev
```

### Environment variables for document-service

| Variable | Default | Description |
|---|---|---|
| `DB_URL` | `jdbc:postgresql://localhost:5434/documents_db` | PostgreSQL URL |
| `DB_USER` | `documents_user` | DB username |
| `DB_PASSWORD` | `documents_pass` | DB password |
| `MINIO_ENDPOINT` | `http://localhost:9000` | MinIO endpoint |
| `MINIO_ACCESS_KEY` | `smartpos` | MinIO access key |
| `MINIO_SECRET_KEY` | `smartpos-secret` | MinIO secret key |
| `MINIO_BUCKET` | `smartpos-documents` | MinIO bucket name |
| `GOTENBERG_URL` | `http://localhost:3000` | Gotenberg base URL |
| `AUTH_JWKS_URI` | `http://localhost:8081/.well-known/jwks.json` | Auth JWKS endpoint |
