# Signup Verification with Email & Phone — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add email (Resend) and phone (Twilio) verification to registration so users must verify before login.

**Architecture:** Direct SDK integration in auth-service — Resend Java SDK for email verification links, Twilio SDK for phone SMS OTP. New `verification_tokens` table, new `/verify` and `/resend-verification` endpoints, modified registration flow that creates PENDING users. Frontend gets a channel toggle on the registration form plus two new pages (verify-sent and verify processing).

**Tech Stack:** Java 17+ / Spring Boot 3 / JPA / Flyway, React 19 / TypeScript / MUI, Resend Java SDK, Twilio Java SDK

---

### Task 1: Add Resend and Twilio dependencies to auth-service pom.xml

**Files:**
- Modify: `backend/auth-service/pom.xml`

- [ ] **Step 1: Add Resend and Twilio SDK dependencies**

Add inside the `<dependencies>` block, after the Lombok dependency:

```xml
<!-- Resend email API -->
<dependency>
    <groupId>com.resend</groupId>
    <artifactId>resend-java</artifactId>
    <version>3.2.0</version>
</dependency>

<!-- Twilio SMS API -->
<dependency>
    <groupId>com.twilio.sdk</groupId>
    <artifactId>twilio</artifactId>
    <version>10.7.0</version>
</dependency>
```

- [ ] **Step 2: Commit**

```bash
git add backend/auth-service/pom.xml
git commit -m "chore: add Resend and Twilio SDK dependencies"
```

---

### Task 2: Create Flyway migration for verification_tokens and phone_number

**Files:**
- Create: `backend/auth-service/src/main/resources/db/migration/V6__add_verification_tokens.sql`
- Create: `backend/auth-service/src/main/resources/db/migration/V7__add_phone_number_to_users.sql`

- [ ] **Step 1: Create V6 migration for verification_tokens table**

```sql
CREATE TABLE verification_tokens (
    id              UUID NOT NULL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash      VARCHAR(255) NOT NULL,
    channel         VARCHAR(10) NOT NULL CHECK (channel IN ('EMAIL', 'PHONE')),
    expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts        INTEGER NOT NULL DEFAULT 0,
    used_at         TIMESTAMP WITH TIME ZONE,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_verification_tokens_user_id ON verification_tokens(user_id);
CREATE INDEX idx_verification_tokens_token_hash ON verification_tokens(token_hash);
```

- [ ] **Step 2: Create V7 migration for phone_number column**

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);
```

- [ ] **Step 3: Commit**

```bash
git add backend/auth-service/src/main/resources/db/migration/V6__add_verification_tokens.sql backend/auth-service/src/main/resources/db/migration/V7__add_phone_number_to_users.sql
git commit -m "feat: add verification_tokens table and phone_number column"
```

---

### Task 3: Create VerificationChannel enum and VerificationToken domain model

**Files:**
- Create: `backend/auth-service/src/main/java/io/smartpos/auth/domain/model/VerificationChannel.java`
- Create: `backend/auth-service/src/main/java/io/smartpos/auth/domain/model/VerificationToken.java`

- [ ] **Step 1: Create VerificationChannel enum**

```java
package io.smartpos.auth.domain.model;

public enum VerificationChannel {
    EMAIL, PHONE
}
```

- [ ] **Step 2: Create VerificationToken entity**

```java
package io.smartpos.auth.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "verification_tokens")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class VerificationToken {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "token_hash", nullable = false)
    private String tokenHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "channel", nullable = false, length = 10)
    private VerificationChannel channel;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "attempts", nullable = false)
    @Builder.Default
    private int attempts = 0;

    @Column(name = "used_at")
    private Instant usedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (createdAt == null) createdAt = Instant.now();
    }

    public boolean isUsed() {
        return usedAt != null;
    }

    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }

    public void markUsed() {
        this.usedAt = Instant.now();
    }

    public void incrementAttempts() {
        this.attempts++;
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/auth-service/src/main/java/io/smartpos/auth/domain/model/VerificationChannel.java backend/auth-service/src/main/java/io/smartpos/auth/domain/model/VerificationToken.java
git commit -m "feat: add VerificationToken domain model and VerificationChannel enum"
```

---

### Task 4: Create VerificationTokenRepository

**Files:**
- Create: `backend/auth-service/src/main/java/io/smartpos/auth/domain/repository/VerificationTokenRepository.java`

- [ ] **Step 1: Create repository interface**

```java
package io.smartpos.auth.domain.repository;

import io.smartpos.auth.domain.model.VerificationToken;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface VerificationTokenRepository extends JpaRepository<VerificationToken, UUID> {

    Optional<VerificationToken> findByTokenHash(String tokenHash);

    long countByUserIdAndUsedAtIsNullAndCreatedAtAfter(UUID userId, java.time.Instant since);

    Optional<VerificationToken> findTopByUserIdAndUsedAtIsNullOrderByCreatedAtDesc(UUID userId);
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/auth-service/src/main/java/io/smartpos/auth/domain/repository/VerificationTokenRepository.java
git commit -m "feat: add VerificationTokenRepository"
```

---

### Task 5: Add phoneNumber to User model

**Files:**
- Modify: `backend/auth-service/src/main/java/io/smartpos/auth/domain/model/User.java`

- [ ] **Step 1: Add phoneNumber field**

Add after the `email` field in User.java:

```java
@Column(name = "phone_number", length = 20)
private String phoneNumber;
```

- [ ] **Step 2: Commit**

```bash
git add backend/auth-service/src/main/java/io/smartpos/auth/domain/model/User.java
git commit -m "feat: add phoneNumber field to User model"
```

---

### Task 6: Update RegisterRequest DTO with channel and phoneNumber

**Files:**
- Modify: `backend/auth-service/src/main/java/io/smartpos/auth/api/dto/RegisterRequest.java`

- [ ] **Step 1: Update RegisterRequest record**

```java
package io.smartpos.auth.api.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record RegisterRequest(
        @Email String email,
        String username,
        @NotBlank @Size(min = 8, max = 255) String password,
        String firstName,
        String lastName,
        UUID tenantId,
        String tenantName,
        String tenantSlug,
        String billingPlan,
        String channel,
        String phoneNumber
) {}
```

The `email` field loses its `@Email @NotBlank` validation at the record level — validation moves to the use case based on channel.

- [ ] **Step 2: Commit**

```bash
git add backend/auth-service/src/main/java/io/smartpos/auth/api/dto/RegisterRequest.java
git commit -m "feat: add channel and phoneNumber fields to RegisterRequest"
```

---

### Task 7: Create VerifyRequest and ResendVerificationRequest DTOs

**Files:**
- Create: `backend/auth-service/src/main/java/io/smartpos/auth/api/dto/VerifyRequest.java`
- Create: `backend/auth-service/src/main/java/io/smartpos/auth/api/dto/ResendVerificationRequest.java`

- [ ] **Step 1: Create VerifyRequest**

```java
package io.smartpos.auth.api.dto;

import jakarta.validation.constraints.NotBlank;

public record VerifyRequest(
        @NotBlank String token
) {}
```

Note: For phone verification, the OTP is passed as the `token`. The backend hashes it via SHA-256 for lookup — there is no separate `code` field needed.

- [ ] **Step 2: Create ResendVerificationRequest**

```java
package io.smartpos.auth.api.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record ResendVerificationRequest(
        @NotNull UUID userId
) {}
```

- [ ] **Step 3: Commit**

```bash
git add backend/auth-service/src/main/java/io/smartpos/auth/api/dto/VerifyRequest.java backend/auth-service/src/main/java/io/smartpos/auth/api/dto/ResendVerificationRequest.java
git commit -m "feat: add VerifyRequest and ResendVerificationRequest DTOs"
```

---

### Task 8: Create Resend and Twilio configuration

**Files:**
- Create: `backend/auth-service/src/main/java/io/smartpos/auth/infrastructure/email/ResendConfig.java`
- Create: `backend/auth-service/src/main/java/io/smartpos/auth/infrastructure/sms/TwilioConfig.java`

- [ ] **Step 1: Create ResendConfig**

```java
package io.smartpos.auth.infrastructure.email;

import com.resend.Resend;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ResendConfig {

    @Value("${smartpos.verification.resend.api-key}")
    private String apiKey;

    @Bean
    public Resend resend() {
        return new Resend(apiKey);
    }

    @Bean
    public String resendFromAddress(@Value("${smartpos.verification.resend.from-address:onboarding@resend.dev}") String from) {
        return from;
    }
}
```

- [ ] **Step 2: Create TwilioConfig**

```java
package io.smartpos.auth.infrastructure.sms;

import com.twilio.Twilio;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import jakarta.annotation.PostConstruct;

@Configuration
public class TwilioConfig {

    @Value("${smartpos.verification.twilio.account-sid}")
    private String accountSid;

    @Value("${smartpos.verification.twilio.auth-token}")
    private String authToken;

    @Value("${smartpos.verification.twilio.phone-number}")
    private String phoneNumber;

    @PostConstruct
    public void init() {
        Twilio.init(accountSid, authToken);
    }

    public String getPhoneNumber() {
        return phoneNumber;
    }
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/auth-service/src/main/java/io/smartpos/auth/infrastructure/email/ResendConfig.java backend/auth-service/src/main/java/io/smartpos/auth/infrastructure/sms/TwilioConfig.java
git commit -m "feat: add Resend and Twilio configuration"
```

---

### Task 9: Create SendVerificationUseCase

**Files:**
- Create: `backend/auth-service/src/main/java/io/smartpos/auth/application/SendVerificationUseCase.java`

- [ ] **Step 1: Write the failing test**

Create: `backend/auth-service/src/test/java/io/smartpos/auth/application/SendVerificationUseCaseTest.java`

```java
package io.smartpos.auth.application;

import com.resend.Resend;
import com.resend.services.emails.Emails;
import com.resend.services.emails.model.SendEmailRequest;
import com.resend.services.emails.model.SendEmailResponse;
import io.smartpos.auth.domain.model.User;
import io.smartpos.auth.domain.model.UserStatus;
import io.smartpos.auth.domain.model.VerificationChannel;
import io.smartpos.auth.domain.model.VerificationToken;
import io.smartpos.auth.domain.repository.VerificationTokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SendVerificationUseCaseTest {

    @Mock private VerificationTokenRepository tokenRepo;
    @Mock private Resend resend;
    @Mock private Emails emails;
    private SendVerificationUseCase useCase;

    private static final String FROM = "onboarding@resend.dev";
    private static final String BASE_URL = "https://app.smartpos.local";

    @BeforeEach
    void setUp() {
        useCase = new SendVerificationUseCase(tokenRepo, resend, FROM, BASE_URL, null);
        when(resend.emails()).thenReturn(emails);
    }

    @Test
    void shouldCreateTokenAndSendEmailForEmailChannel() {
        User user = createPendingUser("test@example.com", null);
        when(tokenRepo.countByUserIdAndUsedAtIsNullAndCreatedAtAfter(any(), any())).thenReturn(0L);
        when(tokenRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(emails.send(any(SendEmailRequest.class))).thenReturn(mock(SendEmailResponse.class));

        useCase.send(user, VerificationChannel.EMAIL);

        ArgumentCaptor<VerificationToken> tokenCaptor = ArgumentCaptor.forClass(VerificationToken.class);
        verify(tokenRepo).save(tokenCaptor.capture());
        assertThat(tokenCaptor.getValue().getChannel()).isEqualTo(VerificationChannel.EMAIL);
        assertThat(tokenCaptor.getValue().getTokenHash()).isNotBlank();
        verify(emails).send(any(SendEmailRequest.class));
    }

    @Test
    void shouldCreateTokenAndSendSmsForPhoneChannel() {
        User user = createPendingUser(null, "+255712345678");
        when(tokenRepo.countByUserIdAndUsedAtIsNullAndCreatedAtAfter(any(), any())).thenReturn(0L);
        when(tokenRepo.save(any())).thenAnswer(inv -> inv.getArgument(0));

        String otp = useCase.send(user, VerificationChannel.PHONE);

        // Verify token saved with PHONE channel
        ArgumentCaptor<VerificationToken> tokenCaptor = ArgumentCaptor.forClass(VerificationToken.class);
        verify(tokenRepo).save(tokenCaptor.capture());
        assertThat(tokenCaptor.getValue().getChannel()).isEqualTo(VerificationChannel.PHONE);
        assertThat(tokenCaptor.getValue().getTokenHash()).isNotBlank();
        // OTP should be 6 digits
        assertThat(otp).hasSize(6);
        assertThat(otp).containsOnlyDigits();
    }

    @Test
    void shouldRejectIfWithinCooldown() {
        User user = createPendingUser("test@example.com", null);
        when(tokenRepo.countByUserIdAndUsedAtIsNullAndCreatedAtAfter(any(), any())).thenReturn(1L);

        assertThatThrownBy(() -> useCase.send(user, VerificationChannel.EMAIL))
                .hasMessageContaining("Please wait");
    }

    @Test
    void shouldRejectIfMaxTokensExceeded() {
        User user = createPendingUser("test@example.com", null);
        when(tokenRepo.countByUserIdAndUsedAtIsNullAndCreatedAtAfter(any(), any())).thenReturn(5L);

        assertThatThrownBy(() -> useCase.send(user, VerificationChannel.EMAIL))
                .hasMessageContaining("Too many verification attempts");
    }

    private User createPendingUser(String email, String phone) {
        User u = new User();
        u.setId(UUID.randomUUID());
        u.setEmail(email);
        u.setPhoneNumber(phone);
        u.setStatus(UserStatus.PENDING);
        u.setCreatedAt(Instant.now());
        return u;
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend/auth-service && mvn test -Dtest=SendVerificationUseCaseTest -pl .`
Expected: Compilation failure — `SendVerificationUseCase` does not exist.

- [ ] **Step 3: Implement SendVerificationUseCase**

```java
package io.smartpos.auth.application;

import com.resend.Resend;
import com.resend.services.emails.model.SendEmailRequest;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import io.smartpos.auth.domain.model.User;
import io.smartpos.auth.domain.model.VerificationChannel;
import io.smartpos.auth.domain.model.VerificationToken;
import io.smartpos.auth.domain.repository.VerificationTokenRepository;
import io.smartpos.auth.infrastructure.sms.TwilioConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.security.SecureRandom;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

@Slf4j
@Service
@RequiredArgsConstructor
public class SendVerificationUseCase {

    private final VerificationTokenRepository tokenRepo;
    private final Resend resend;
    private final String resendFromAddress;
    private final String appBaseUrl;
    private final TwilioConfig twilioConfig;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final Duration EMAIL_TTL = Duration.ofHours(24);
    private static final Duration PHONE_TTL = Duration.ofMinutes(10);
    private static final Duration RESEND_COOLDOWN = Duration.ofSeconds(60);
    private static final int MAX_TOKENS = 5;

    @Transactional
    public String send(User user, VerificationChannel channel) {
        long recentCount = tokenRepo.countByUserIdAndUsedAtIsNullAndCreatedAtAfter(
                user.getId(), Instant.now().minus(RESEND_COOLDOWN));
        if (recentCount > 0) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Please wait at least 60 seconds before requesting another verification.");
        }

        long totalPending = tokenRepo.countByUserIdAndUsedAtIsNullAndCreatedAtAfter(
                user.getId(), Instant.now().minus(EMAIL_TTL));
        if (totalPending >= MAX_TOKENS) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Too many verification attempts. Please contact support.");
        }

        String rawToken = generateToken(48);
        String tokenHash = sha256(rawToken);
        Duration ttl = channel == VerificationChannel.PHONE ? PHONE_TTL : EMAIL_TTL;
        String otp = null;

        if (channel == VerificationChannel.PHONE) {
            otp = generateOtp(6);
        }

        VerificationToken token = VerificationToken.builder()
                .userId(user.getId())
                .tokenHash(tokenHash)
                .channel(channel)
                .expiresAt(Instant.now().plus(ttl))
                .build();
        tokenRepo.save(token);

        if (channel == VerificationChannel.EMAIL) {
            sendEmail(user.getEmail(), rawToken);
        } else {
            sendSms(user.getPhoneNumber(), otp);
        }

        log.info("Sent {} verification to user={}", channel, user.getId());

        // Return the raw token for email; for phone return the OTP (hashed separately).
        // For the API response we return the rawToken so the client can use it.
        return channel == VerificationChannel.PHONE ? otp : rawToken;
    }

    private void sendEmail(String to, String rawToken) {
        String verifyUrl = appBaseUrl + "/auth/verify?token=" + rawToken;
        String html = "<p>Welcome to SmartPOS!</p>"
                + "<p>Click the link below to verify your account:</p>"
                + "<p><a href=\"" + verifyUrl + "\">" + verifyUrl + "</a></p>"
                + "<p>This link expires in 24 hours.</p>";

        try {
            resend.emails().send(SendEmailRequest.builder()
                    .from(resendFromAddress)
                    .to(to)
                    .subject("Verify your SmartPOS account")
                    .html(html)
                    .build());
        } catch (Exception e) {
            log.error("Failed to send verification email to {}: {}", to, e.getMessage());
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Failed to send verification email. Please try again.");
        }
    }

    private void sendSms(String to, String otp) {
        try {
            Message.creator(
                    new PhoneNumber(to),
                    new PhoneNumber(twilioConfig.getPhoneNumber()),
                    "Your SmartPOS verification code is: " + otp + ". It expires in 10 minutes."
            ).create();
        } catch (Exception e) {
            log.error("Failed to send verification SMS to {}: {}", to, e.getMessage());
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Failed to send verification SMS. Please try again.");
        }
    }

    private String generateToken(int byteLength) {
        byte[] bytes = new byte[byteLength];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String generateOtp(int digits) {
        int lower = (int) Math.pow(10, digits - 1);
        int upper = (int) Math.pow(10, digits) - 1;
        int otp = lower + SECURE_RANDOM.nextInt(upper - lower + 1);
        return String.valueOf(otp);
    }

    static String sha256(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend/auth-service && mvn test -Dtest=SendVerificationUseCaseTest -pl .`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/auth-service/src/main/java/io/smartpos/auth/application/SendVerificationUseCase.java backend/auth-service/src/test/java/io/smartpos/auth/application/SendVerificationUseCaseTest.java
git commit -m "feat: add SendVerificationUseCase with Resend email and Twilio SMS"
```

---

### Task 10: Create VerifyUserUseCase

**Files:**
- Create: `backend/auth-service/src/main/java/io/smartpos/auth/application/VerifyUserUseCase.java`

- [ ] **Step 1: Write the failing test**

Create: `backend/auth-service/src/test/java/io/smartpos/auth/application/VerifyUserUseCaseTest.java`

```java
package io.smartpos.auth.application;

import io.smartpos.auth.domain.model.User;
import io.smartpos.auth.domain.model.UserStatus;
import io.smartpos.auth.domain.model.VerificationChannel;
import io.smartpos.auth.domain.model.VerificationToken;
import io.smartpos.auth.domain.repository.UserRepository;
import io.smartpos.auth.domain.repository.VerificationTokenRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VerifyUserUseCaseTest {

    @Mock private VerificationTokenRepository tokenRepo;
    @Mock private UserRepository userRepo;
    private VerifyUserUseCase useCase;

    @BeforeEach
    void setUp() {
        useCase = new VerifyUserUseCase(tokenRepo, userRepo);
    }

    @Test
    void shouldVerifyEmailToken() {
        User user = pendingUser();
        VerificationToken token = validToken(user.getId(), VerificationChannel.EMAIL);
        when(tokenRepo.findByTokenHash(any())).thenReturn(Optional.of(token));
        when(userRepo.findById(user.getId())).thenReturn(Optional.of(user));

        String result = useCase.verify("raw-token");

        assertThat(result).isEqualTo(user.getEmail());
        assertThat(user.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(token.isUsed()).isTrue();
        verify(userRepo).save(user);
        verify(tokenRepo).save(token);
    }

    @Test
    void shouldRejectUsedToken() {
        VerificationToken token = validToken(UUID.randomUUID(), VerificationChannel.EMAIL);
        token.markUsed();
        when(tokenRepo.findByTokenHash(any())).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> useCase.verify("raw-token"))
                .hasMessageContaining("already been used");
    }

    @Test
    void shouldRejectExpiredToken() {
        VerificationToken token = VerificationToken.builder()
                .userId(UUID.randomUUID())
                .tokenHash("hash")
                .channel(VerificationChannel.EMAIL)
                .expiresAt(Instant.now().minusSeconds(1))
                .build();
        when(tokenRepo.findByTokenHash(any())).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> useCase.verify("raw-token"))
                .hasMessageContaining("expired");
    }

    @Test
    void shouldRejectInvalidToken() {
        when(tokenRepo.findByTokenHash(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> useCase.verify("bad-token"))
                .hasMessageContaining("Invalid verification");
    }

    @Test
    void shouldVerifyPhoneOtpCorrectly() {
        User user = pendingUser();
        // Pre-compute hash of "123456" so we can look it up
        VerificationToken token = VerificationToken.builder()
                .userId(user.getId())
                .tokenHash(SendVerificationUseCase.sha256("123456"))
                .channel(VerificationChannel.PHONE)
                .expiresAt(Instant.now().plusSeconds(300))
                .build();
        when(tokenRepo.findByTokenHash(any())).thenReturn(Optional.of(token));
        when(userRepo.findById(user.getId())).thenReturn(Optional.of(user));

        String result = useCase.verify("123456");

        assertThat(result).isEqualTo(user.getPhoneNumber());
        assertThat(user.getStatus()).isEqualTo(UserStatus.ACTIVE);
    }

    @Test
    void shouldIncrementAttemptsOnWrongOtp() {
        VerificationToken token = validToken(UUID.randomUUID(), VerificationChannel.PHONE);
        when(tokenRepo.findByTokenHash(any())).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> useCase.verify("wrong-code"))
                .hasMessageContaining("Invalid verification code");
        verify(tokenRepo).save(argThat(t -> t.getAttempts() == 1));
    }

    @Test
    void shouldInvalidateTokenAfterMaxAttempts() {
        VerificationToken token = validToken(UUID.randomUUID(), VerificationChannel.PHONE);
        token.setAttempts(3); // already at max
        when(tokenRepo.findByTokenHash(any())).thenReturn(Optional.of(token));

        assertThatThrownBy(() -> useCase.verify("wrong-code"))
                .hasMessageContaining("Too many failed attempts");
        verify(tokenRepo).save(argThat(t -> t.isUsed())); // invalidated
    }

    private User pendingUser() {
        User u = new User();
        u.setId(UUID.randomUUID());
        u.setEmail("test@example.com");
        u.setPhoneNumber("+255712345678");
        u.setStatus(UserStatus.PENDING);
        u.setCreatedAt(Instant.now());
        return u;
    }

    private VerificationToken validToken(UUID userId, VerificationChannel channel) {
        return VerificationToken.builder()
                .userId(userId)
                .tokenHash(SendVerificationUseCase.sha256("raw-token"))
                .channel(channel)
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend/auth-service && mvn test -Dtest=VerifyUserUseCaseTest -pl .`
Expected: FAIL — `VerifyUserUseCase` does not exist.

- [ ] **Step 3: Implement VerifyUserUseCase**

```java
package io.smartpos.auth.application;

import io.smartpos.auth.domain.model.User;
import io.smartpos.auth.domain.model.UserStatus;
import io.smartpos.auth.domain.model.VerificationToken;
import io.smartpos.auth.domain.repository.UserRepository;
import io.smartpos.auth.domain.repository.VerificationTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Slf4j
@Service
@RequiredArgsConstructor
public class VerifyUserUseCase {

    private final VerificationTokenRepository tokenRepo;
    private final UserRepository userRepo;

    private static final int MAX_PHONE_ATTEMPTS = 3;

    @Transactional
    public String verify(String rawToken) {
        String lookupHash = SendVerificationUseCase.sha256(rawToken);
        VerificationToken token = tokenRepo.findByTokenHash(lookupHash)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Invalid verification link or code."));

        if (token.isUsed()) {
            throw new ResponseStatusException(HttpStatus.GONE,
                    "This verification link has already been used. Please log in or request a new one.");
        }

        if (token.isExpired()) {
            throw new ResponseStatusException(HttpStatus.GONE,
                    "This verification link has expired. Please request a new one.");
        }

        if (token.getChannel() == io.smartpos.auth.domain.model.VerificationChannel.PHONE && token.getAttempts() >= MAX_PHONE_ATTEMPTS) {
            token.markUsed();
            tokenRepo.save(token);
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Too many failed attempts. Please request a new verification code.");
        }

        User user = userRepo.findById(token.getUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                        "User not found for this verification token."));

        if (user.getStatus() == UserStatus.ACTIVE) {
            token.markUsed();
            tokenRepo.save(token);
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Account is already verified. Please log in.");
        }

        user.setStatus(UserStatus.ACTIVE);
        userRepo.save(user);

        token.markUsed();
        tokenRepo.save(token);

        log.info("Verified user={} via channel={}", user.getId(), token.getChannel());

        return token.getChannel() == io.smartpos.auth.domain.model.VerificationChannel.PHONE
                ? user.getPhoneNumber()
                : user.getEmail();
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend/auth-service && mvn test -Dtest=VerifyUserUseCaseTest -pl .`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/auth-service/src/main/java/io/smartpos/auth/application/VerifyUserUseCase.java backend/auth-service/src/test/java/io/smartpos/auth/application/VerifyUserUseCaseTest.java
git commit -m "feat: add VerifyUserUseCase"
```

---

### Task 11: Modify RegisterUserUseCase for PENDING status and verification

**Files:**
- Modify: `backend/auth-service/src/main/java/io/smartpos/auth/application/RegisterUserUseCase.java`

- [ ] **Step 1: Update RegisterUserUseCase**

Change the `register` method. Replace the user creation block (lines 84-90) and add validation + verification call:

```java
@Slf4j
@Service
@RequiredArgsConstructor
public class RegisterUserUseCase {

    private final UserRepository userRepository;
    private final OutboxRepository outboxRepository;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;
    private final TenantService tenantService;
    private final BillingClient billingClient;
    private final SendVerificationUseCase sendVerificationUseCase;

    @Transactional
    public UUID register(RegisterRequest req) {
        // Validate channel: must be EMAIL or PHONE
        String channelStr = req.channel() != null ? req.channel().toUpperCase() : "EMAIL";
        VerificationChannel channel;
        try {
            channel = VerificationChannel.valueOf(channelStr);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid channel. Must be EMAIL or PHONE.");
        }

        if (channel == VerificationChannel.EMAIL) {
            if (req.email() == null || req.email().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required for EMAIL channel.");
            }
            if (userRepository.existsByEmailIgnoreCase(req.email())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
            }
        } else {
            if (req.phoneNumber() == null || req.phoneNumber().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phone number is required for PHONE channel.");
            }
        }

        // Resolve tenant (unchanged)
        UUID tenantId = req.tenantId();
        Tenant tenant = null;
        if (tenantId == null && req.tenantName() != null && !req.tenantName().isBlank()) {
            BillingPlan plan = req.billingPlan() != null && !req.billingPlan().isBlank()
                    ? BillingPlan.valueOf(req.billingPlan().toUpperCase())
                    : null;
            tenant = tenantService.create(req.tenantName(), req.tenantSlug(), plan);
            tenantId = tenant.getId();

            try {
                Instant now = Instant.now();
                billingClient.createSubscription(Map.of(
                        "tenantId", tenant.getId().toString(),
                        "planCode", tenant.getBillingPlan().name().toLowerCase(),
                        "status", "TRIAL",
                        "billingCycle", "MONTHLY",
                        "currentPeriodStart", now.toString(),
                        "currentPeriodEnd", now.plusSeconds(30 * 86400).toString()
                ));
            } catch (Exception e) {
                log.warn("Failed to create subscription for tenant {}: {}", tenant.getId(), e.getMessage());
            }
        }

        // Enforce plan maxUsers limit (unchanged)
        if (tenantId != null) {
            if (tenant == null) {
                tenant = tenantService.getById(tenantId);
            }
            long currentCount = userRepository.countByTenantId(tenantId);
            if (currentCount >= tenant.getMaxUsers()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "User limit reached. Your plan allows " + tenant.getMaxUsers()
                        + " users. Upgrade to add more.");
            }
        }

        // Create user as PENDING
        User user = User.builder()
                .email(channel == VerificationChannel.EMAIL ? req.email().toLowerCase() : null)
                .phoneNumber(channel == VerificationChannel.PHONE ? req.phoneNumber() : null)
                .username(channel == VerificationChannel.EMAIL ? req.email().toLowerCase() : req.phoneNumber())
                .passwordHash(passwordEncoder.encode(req.password()))
                .status(UserStatus.PENDING)
                .tenantId(tenantId)
                .build();
        try {
            user = userRepository.save(user);
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }

        // Emit UserRegistered event
        publishUserRegistered(user, req);

        // Send verification
        try {
            sendVerificationUseCase.send(user, channel);
        } catch (Exception e) {
            log.warn("Failed to send verification for user={}: {}", user.getId(), e.getMessage());
            // User is created but verification email/SMS failed — they can resend.
        }

        log.info("Registered user id={} channel={} tenantId={}", user.getId(), channel, tenantId);
        return user.getId();
    }

    // publishUserRegistered unchanged...
}
```

Note: You need to add the import for `VerificationChannel`:
```java
import io.smartpos.auth.domain.model.VerificationChannel;
```

- [ ] **Step 2: Commit**

```bash
git add backend/auth-service/src/main/java/io/smartpos/auth/application/RegisterUserUseCase.java
git commit -m "feat: register users as PENDING and send verification email/SMS"
```

---

### Task 12: Add verify and resend endpoints to AuthController

**Files:**
- Modify: `backend/auth-service/src/main/java/io/smartpos/auth/api/AuthController.java`

- [ ] **Step 1: Add new endpoints**

Add after the `/password/change` endpoint:

```java
@PostMapping("/verify")
public ResponseEntity<Map<String, String>> verify(@Valid @RequestBody VerifyRequest req) {
    String contact = verifyUserUseCase.verify(req.token());
    return ResponseEntity.ok(Map.of(
            "status", "verified",
            "contact", contact
    ));
}

@PostMapping("/resend-verification")
public ResponseEntity<Map<String, String>> resendVerification(@Valid @RequestBody ResendVerificationRequest req) {
    // Look up the user and their most recent pending token to determine channel
    // For simplicity we resend based on whichever contact method exists
    User user = userRepository.findById(req.userId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

    if (user.getStatus() != UserStatus.PENDING) {
        throw new ResponseStatusException(HttpStatus.CONFLICT, "Account is already verified. Please log in.");
    }

    VerificationChannel channel = user.getEmail() != null ? VerificationChannel.EMAIL : VerificationChannel.PHONE;
    sendVerificationUseCase.send(user, channel);
    return ResponseEntity.ok(Map.of("message", "Verification sent"));
}
```

Add these new constructor dependencies to the `@RequiredArgsConstructor` fields:
```java
private final VerifyUserUseCase verifyUserUseCase;
private final SendVerificationUseCase sendVerificationUseCase;
private final UserRepository userRepository;
```

Add imports:
```java
import io.smartpos.auth.domain.model.User;
import io.smartpos.auth.domain.model.UserStatus;
import io.smartpos.auth.domain.model.VerificationChannel;
import io.smartpos.auth.domain.repository.UserRepository;
```

- [ ] **Step 2: Commit**

```bash
git add backend/auth-service/src/main/java/io/smartpos/auth/api/AuthController.java
git commit -m "feat: add verify and resend-verification endpoints to AuthController"
```

---

### Task 13: Add configuration properties to application.yml

**Files:**
- Modify: `backend/auth-service/src/main/resources/application.yml`

- [ ] **Step 1: Add verification config block**

Add under `smartpos:` section:

```yaml
smartpos:
  verification:
    resend:
      api-key: ${RESEND_API_KEY:}
      from-address: ${RESEND_FROM_ADDRESS:onboarding@resend.dev}
    twilio:
      account-sid: ${TWILIO_ACCOUNT_SID:}
      auth-token: ${TWILIO_AUTH_TOKEN:}
      phone-number: ${TWILIO_PHONE_NUMBER:}
    app-base-url: ${APP_BASE_URL:http://localhost:5173}
```

- [ ] **Step 2: Commit**

```bash
git add backend/auth-service/src/main/resources/application.yml
git commit -m "chore: add verification configuration properties"
```

---

### Task 14: Whitelist new endpoints in Gateway SecurityConfig

**Files:**
- Modify: `backend/gateway/src/main/java/io/smartpos/gateway/SecurityConfig.java`

- [ ] **Step 1: Add new paths to permitAll()**

Replace the existing `.pathMatchers(...)` block (lines 47-59) with:

```java
.pathMatchers(
        "/api/v1/auth/login",
        "/api/v1/auth/refresh",
        "/api/v1/auth/logout",
        "/api/v1/auth/register",
        "/api/v1/auth/verify",
        "/api/v1/auth/resend-verification",
        "/api/v1/auth/password/**",
        "/api/v1/billing/plans",
        "/api/v1/support/demo-requests",
        "/api/v1/payments/stripe/webhook",
        "/webhooks/**",
        "/.well-known/jwks.json",
        "/actuator/**"
).permitAll()
```

- [ ] **Step 2: Commit**

```bash
git add backend/gateway/src/main/java/io/smartpos/gateway/SecurityConfig.java
git commit -m "feat: whitelist verify and resend-verification endpoints in gateway"
```

---

### Task 15: Add verify and resendVerification API functions to frontend

**Files:**
- Modify: `frontend/src/api/smartpos/auth.ts`

- [ ] **Step 1: Update RegisterPayload and add new API functions**

Add after the `register` function:

```typescript
export interface RegisterPayload {
  email?: string;
  password: string;
  firstName?: string;
  lastName?: string;
  tenantName?: string;
  tenantSlug?: string;
  billingPlan?: string;
  channel?: 'EMAIL' | 'PHONE';
  phoneNumber?: string;
}

export async function verifyAccount(token: string): Promise<{ status: string; contact: string }> {
  const { data } = await api.post<{ status: string; contact: string }>('/api/v1/auth/verify', { token });
  return data;
}

export async function resendVerification(userId: string): Promise<{ message: string }> {
  const { data } = await api.post<{ message: string }>('/api/v1/auth/resend-verification', { userId });
  return data;
}
```

Note: The existing `RegisterPayload` interface on line 47 needs to be updated — remove the old one and replace with the new one above.

- [ ] **Step 2: Commit**

```bash
git add frontend/src/api/smartpos/auth.ts
git commit -m "feat: add verify and resendVerification API functions"
```

---

### Task 16: Modify AuthRegister to add Email/Phone channel toggle

**Files:**
- Modify: `frontend/src/views/authentication/authForms/AuthRegister.tsx`

- [ ] **Step 1: Add channel state and toggle UI in Step 3**

Add new state after existing state declarations (after `const [password, setPassword] = useState('');`):

```typescript
const [channel, setChannel] = useState<'EMAIL' | 'PHONE'>('EMAIL');
const [phoneNumber, setPhoneNumber] = useState('');
```

Add new icon import at top (add `IconPhone` to the tabler-icons import):
```typescript
import {
  IconArrowLeft,
  IconArrowRight,
  IconBuilding,
  IconCheck,
  IconEye,
  IconEyeOff,
  IconLock,
  IconMail,
  IconPhone,
  IconUser,
} from '@tabler/icons-react';
```

Update the `isAccountReady` check:
```typescript
const isAccountReady = channel === 'EMAIL'
  ? email.trim().length > 0 && password.length >= 8
  : phoneNumber.trim().length > 0 && password.length >= 8;
```

Update the `handleSubmit` function to pass channel and phoneNumber:
```typescript
const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { userId } = await register({
        email: channel === 'EMAIL' ? email.trim().toLowerCase() : undefined,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        tenantName: tenantName.trim(),
        tenantSlug: tenantSlug.trim() || undefined,
        billingPlan: selectedPlanCode || 'STARTER',
        channel,
        phoneNumber: channel === 'PHONE' ? phoneNumber.trim() : undefined,
      });
      navigate('/auth/verify-sent', {
        state: {
          userId,
          channel,
          contact: channel === 'EMAIL' ? email.trim().toLowerCase() : phoneNumber.trim(),
        },
      });
      seedDefaultUnits().catch(() => {});
      seedDefaultCOA().catch(() => {});
    } catch (err) {
      // ... same error handling
    }
};
```

In Step 3's JSX, add the channel toggle at the top (after the heading text, before the name fields):

```tsx
{/* Channel toggle */}
<Stack direction="row" spacing={0} sx={{
  bgcolor: brand.neutral[100],
  borderRadius: '10px',
  p: 0.5,
  mb: 1,
}}>
  {(['EMAIL', 'PHONE'] as const).map((ch) => (
    <Box
      key={ch}
      onClick={() => setChannel(ch)}
      sx={{
        flex: 1,
        textAlign: 'center',
        py: 1,
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '0.8rem',
        fontWeight: 700,
        color: channel === ch ? brand.primary[700] : brand.neutral[500],
        bgcolor: channel === ch ? '#FFFFFF' : 'transparent',
        boxShadow: channel === ch ? `0 1px 3px rgba(0,0,0,0.08)` : 'none',
        transition: 'all 0.2s ease',
      }}
    >
      {ch === 'EMAIL' ? 'Email' : 'Phone'}
    </Box>
  ))}
</Stack>
```

Replace the email field section with conditional rendering based on channel:

```tsx
{channel === 'EMAIL' ? (
  <Box>
    <Typography component="label" htmlFor="email" sx={labelSx}>
      Email address
    </Typography>
    <TextField
      id="email"
      name="email"
      type="email"
      autoComplete="email"
      placeholder="you@company.com"
      fullWidth required
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      sx={fieldSx}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start" sx={{ color: brand.neutral[400] }}>
            <IconMail size={17} stroke={1.6} />
          </InputAdornment>
        ),
      }}
    />
  </Box>
) : (
  <Box>
    <Typography component="label" htmlFor="phoneNumber" sx={labelSx}>
      Phone number
    </Typography>
    <TextField
      id="phoneNumber"
      name="phoneNumber"
      type="tel"
      autoComplete="tel"
      placeholder="+255 712 345 678"
      fullWidth required
      value={phoneNumber}
      onChange={(e) => setPhoneNumber(e.target.value)}
      sx={fieldSx}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start" sx={{ color: brand.neutral[400] }}>
            <IconPhone size={17} stroke={1.6} />
          </InputAdornment>
        ),
      }}
    />
  </Box>
)}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/views/authentication/authForms/AuthRegister.tsx
git commit -m "feat: add Email/Phone channel toggle to registration step 3"
```

---

### Task 17: Create VerificationSentPage

**Files:**
- Create: `frontend/src/views/authentication/auth1/VerificationSent.tsx`
- Create: `frontend/src/views/authentication/authForms/VerificationSentForm.tsx`

- [ ] **Step 1: Create the page wrapper**

`VerificationSent.tsx`:
```tsx
import LetisAuthLayout from './LetisAuthLayout';
import VerificationSentForm from '../authForms/VerificationSentForm';

const VerificationSent = () => (
  <LetisAuthLayout
    mode="register"
    pageTitle="Verify your account"
    pageDescription="Complete your registration by verifying your contact method."
    headline="Check your inbox."
    accent="Almost there."
    supportingText="Verify your email or phone to activate your account and start using SmartPOS."
    formTitle="Verify account"
    formDescription=""
  >
    <VerificationSentForm />
  </LetisAuthLayout>
);

export default VerificationSent;
```

- [ ] **Step 2: Create the form component**

`VerificationSentForm.tsx`:
```tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Stack,
  TextField,
  Typography,
  keyframes,
} from '@mui/material';
import { IconMail, IconCheck, IconRefresh } from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router';
import { resendVerification, verifyAccount } from 'src/api/smartpos/auth';
import { brand } from 'src/theme/smartpos/brand';

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    borderRadius: '10px',
    bgcolor: '#FFFFFF',
    fontSize: '1.2rem',
    height: 56,
    '& fieldset': { borderColor: brand.neutral[200] },
    '&:hover fieldset': { borderColor: brand.neutral[300] },
    '&.Mui-focused fieldset': {
      borderColor: brand.primary[500],
      borderWidth: 1.5,
    },
  },
  '& .MuiOutlinedInput-input': { py: 1.2, textAlign: 'center', letterSpacing: '0.5em' },
};

const VerificationSentForm: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { userId?: string; channel?: 'EMAIL' | 'PHONE'; contact?: string } | null;

  const userId = state?.userId;
  const channel = state?.channel ?? 'EMAIL';
  const contact = state?.contact ?? '';

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [verified, setVerified] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const handleResend = useCallback(async () => {
    if (!userId || cooldown > 0) return;
    setResending(true);
    setError(null);
    try {
      await resendVerification(userId);
      setCooldown(60);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Failed to resend. Please try again.');
    } finally {
      setResending(false);
    }
  }, [userId, cooldown]);

  const handleVerify = useCallback(async (otp: string) => {
    if (!userId || otp.length !== 6) return;
    setVerifying(true);
    setError(null);
    try {
      await verifyAccount(otp); // OTP is used as the token — backend hashes it for lookup
      setVerified(true);
      setTimeout(() => navigate('/auth/login', { state: { registered: true } }), 1500);
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? 'Invalid code. Please try again.');
      setCode('');
      inputRefs.current[0]?.focus();
    } finally {
      setVerifying(false);
    }
  }, [userId, navigate]);

  // Auto-submit when 6 digits entered (phone only)
  useEffect(() => {
    if (channel === 'PHONE' && code.length === 6 && !verifying && !verified) {
      handleVerify(code);
    }
  }, [code, channel, verifying, verified, handleVerify]);

  if (!userId) {
    return (
      <Alert severity="error" sx={{ borderRadius: '10px' }}>
        Missing registration information. Please try registering again.
      </Alert>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: '10px' }}>{error}</Alert>
      )}

      {verified && (
        <Alert severity="success" icon={<IconCheck size={18} />} sx={{ mb: 2.5, borderRadius: '10px' }}>
          Account verified! Redirecting to login...
        </Alert>
      )}

      {channel === 'EMAIL' ? (
        <Stack spacing={3} alignItems="center" textAlign="center">
          <Box
            sx={{
              width: 72, height: 72, borderRadius: '50%',
              bgcolor: brand.primary[50], display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              animation: `${pulse} 2s ease-in-out infinite`,
            }}
          >
            <IconMail size={32} color={brand.primary[500]} stroke={1.5} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: brand.neutral[900] }}>
              Check your email
            </Typography>
            <Typography sx={{ mt: 0.5, fontSize: '0.82rem', color: brand.neutral[500], lineHeight: 1.5 }}>
              We sent a verification link to <strong>{contact}</strong>.
              Click the link in the email to activate your account.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={resending ? <CircularProgress size={16} /> : <IconRefresh size={16} />}
            disabled={resending || cooldown > 0}
            onClick={handleResend}
            sx={{
              py: 1.2, px: 3, fontSize: '0.85rem', fontWeight: 600,
              textTransform: 'none', borderRadius: '10px',
              color: brand.primary[600], borderColor: brand.primary[200],
              '&:hover': { borderColor: brand.primary[400], bgcolor: brand.primary[50] },
            }}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend email'}
          </Button>
        </Stack>
      ) : (
        <Stack spacing={3} alignItems="center">
          <Box>
            <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: brand.neutral[900], textAlign: 'center' }}>
              Enter verification code
            </Typography>
            <Typography sx={{ mt: 0.5, fontSize: '0.82rem', color: brand.neutral[500], textAlign: 'center', lineHeight: 1.5 }}>
              We sent a 6-digit code to <strong>{contact}</strong>
            </Typography>
          </Box>

          <TextField
            id="otp"
            name="otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            fullWidth
            value={code}
            disabled={verifying || verified}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 6);
              setCode(val);
            }}
            sx={fieldSx}
          />

          <Button
            variant="outlined"
            startIcon={resending ? <CircularProgress size={16} /> : <IconRefresh size={16} />}
            disabled={resending || cooldown > 0}
            onClick={handleResend}
            sx={{
              py: 1.2, px: 3, fontSize: '0.85rem', fontWeight: 600,
              textTransform: 'none', borderRadius: '10px',
              color: brand.primary[600], borderColor: brand.primary[200],
              '&:hover': { borderColor: brand.primary[400], bgcolor: brand.primary[50] },
            }}
          >
            {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
          </Button>
        </Stack>
      )}
    </Box>
  );
};

export default VerificationSentForm;
```

Wait — I need to fix the phone verification flow. The API expects `{ token, code? }`. For email, we pass the raw token from the URL. For phone, the OTP IS the token — both are the same value, hashed on the backend. Let me fix the `verifyPhone` call to match:

Actually, looking at the API design again: for phone, the user enters a 6-digit OTP. The backend stores `sha256(otp)` in `token_hash`. So the verify endpoint receives `{ token: "123456", code: "123456" }` — token gets hashed for lookup, and we also validate the code matches. But actually the way `VerifyUserUseCase.verify()` works, it only hashes the token for lookup. There's no separate `code` validation. For phone, the "token" IS the OTP. So we should call:

```
POST /api/v1/auth/verify { token: "123456" }
```

Let me fix the API function and form accordingly.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/authentication/auth1/VerificationSent.tsx frontend/src/views/authentication/authForms/VerificationSentForm.tsx
git commit -m "feat: add VerificationSent page with email instructions and phone OTP input"
```

---

### Task 18: Create VerifyPage (deep link handler for email verification)

**Files:**
- Create: `frontend/src/views/authentication/auth1/Verify.tsx`
- Create: `frontend/src/views/authentication/authForms/VerifyForm.tsx`

- [ ] **Step 1: Create the page wrapper**

`Verify.tsx`:
```tsx
import LetisAuthLayout from './LetisAuthLayout';
import VerifyForm from '../authForms/VerifyForm';

const Verify = () => (
  <LetisAuthLayout
    mode="register"
    pageTitle="Verifying your account"
    pageDescription="Completing email verification."
    headline="Verifying..."
    accent=""
    supportingText=""
    formTitle=""
    formDescription=""
  >
    <VerifyForm />
  </LetisAuthLayout>
);

export default Verify;
```

- [ ] **Step 2: Create the form component**

`VerifyForm.tsx`:
```tsx
import React, { useEffect, useState } from 'react';
import { Alert, Box, CircularProgress, Typography, Button } from '@mui/material';
import { IconCheck, IconX } from '@tabler/icons-react';
import { useSearchParams, useNavigate, Link } from 'react-router';
import { verifyEmail } from 'src/api/smartpos/auth';
import { brand } from 'src/theme/smartpos/brand';

const VerifyForm: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token. Please check your email link and try again.');
      return;
    }

    (async () => {
      try {
        await verifyEmail(token);
        setStatus('success');
        setMessage('Account verified! Redirecting to login...');
        setTimeout(() => navigate('/auth/login', { state: { registered: true } }), 2000);
      } catch (err: any) {
        setStatus('error');
        setMessage(err?.response?.data?.detail ?? 'Verification failed. The link may be invalid or expired.');
      }
    })();
  }, [token, navigate]);

  return (
    <Box sx={{ textAlign: 'center', py: 2 }}>
      {status === 'loading' && (
        <>
          <CircularProgress size={40} sx={{ color: brand.primary[500], mb: 2 }} />
          <Typography sx={{ fontSize: '0.9rem', color: brand.neutral[600] }}>
            Verifying your account...
          </Typography>
        </>
      )}

      {status === 'success' && (
        <>
          <Box sx={{
            width: 56, height: 56, borderRadius: '50%',
            bgcolor: brand.success[50], display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            mx: 'auto', mb: 2,
          }}>
            <IconCheck size={28} color={brand.success[500]} />
          </Box>
          <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: brand.neutral[900], mb: 1 }}>
            {message}
          </Typography>
        </>
      )}

      {status === 'error' && (
        <>
          <Box sx={{
            width: 56, height: 56, borderRadius: '50%',
            bgcolor: brand.error[50], display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            mx: 'auto', mb: 2,
          }}>
            <IconX size={28} color={brand.error[500]} />
          </Box>
          <Typography sx={{ fontSize: '0.9rem', color: brand.neutral[700], mb: 2 }}>
            {message}
          </Typography>
          <Button
            component={Link}
            to="/auth/login"
            variant="outlined"
            sx={{
              py: 1.2, px: 3, fontSize: '0.85rem', fontWeight: 600,
              textTransform: 'none', borderRadius: '10px',
            }}
          >
            Go to login
          </Button>
        </>
      )}
    </Box>
  );
};

export default VerifyForm;
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/authentication/auth1/Verify.tsx frontend/src/views/authentication/authForms/VerifyForm.tsx
git commit -m "feat: add Verify page for email verification deep links"
```

---

### Task 19: Add new routes to Router.tsx

**Files:**
- Modify: `frontend/src/routes/Router.tsx`

- [ ] **Step 1: Add lazy imports for new pages**

Add after the existing auth imports (around line 491):

```typescript
const VerificationSent = Loadable(lazy(() => import('../views/authentication/auth1/VerificationSent')));
const Verify = Loadable(lazy(() => import('../views/authentication/auth1/Verify')));
```

- [ ] **Step 2: Add routes in BlankLayout children**

Add after `{ path: '/auth/two-steps2', element: <TwoSteps2 /> },`:
```typescript
{ path: '/auth/verify-sent', element: <VerificationSent /> },
{ path: '/auth/verify', element: <Verify /> },
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/routes/Router.tsx
git commit -m "feat: add /auth/verify-sent and /auth/verify routes"
```

---

### Task 20: Update VerifyForm imports

**Files:**
- Modify: `frontend/src/views/authentication/authForms/VerifyForm.tsx`

- [ ] **Step 1: Ensure VerifyForm uses the correct import**

If the generated file uses `verifyEmail`, update it to `verifyAccount`:

```typescript
import { verifyAccount } from 'src/api/smartpos/auth';
```

The call site should be:
```typescript
await verifyAccount(token);
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/views/authentication/authForms/VerifyForm.tsx
git commit -m "fix: use verifyAccount in VerifyForm"
```

---

### Task 21: End-to-end flow verification

- [ ] **Step 1: Start backend with required env vars**

```bash
export RESEND_API_KEY=re_XXXXXXXX  # Replace with actual key
export TWILIO_ACCOUNT_SID=ACxxxxx
export TWILIO_AUTH_TOKEN=xxxxx
export TWILIO_PHONE_NUMBER=+15551234567
export APP_BASE_URL=http://localhost:5173
cd backend/auth-service && mvn spring-boot:run
```

- [ ] **Step 2: Start frontend**

```bash
cd frontend && npm run dev
```

- [ ] **Step 3: Manually test the flow**

1. Navigate to `/auth/register`
2. Select plan → enter workspace → on step 3 toggle between Email and Phone
3. Submit with Email → verify redirected to `/auth/verify-sent` with email instructions
4. Check Resend dashboard for sent email
5. Submit with Phone → verify redirected to `/auth/verify-sent` with OTP input
6. Check Twilio logs for sent SMS
7. Test `/auth/verify?token=xxx` with a valid token → verify redirect to login
8. Test login with unverified user → verify "Account is PENDING" error
9. Test login with verified user → verify success
10. Test resend button → verify 60s cooldown
