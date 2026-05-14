package io.smartpos.auth.application;

import io.smartpos.auth.domain.model.PasswordResetToken;
import io.smartpos.auth.domain.model.User;
import io.smartpos.auth.domain.repository.PasswordResetTokenRepository;
import io.smartpos.auth.domain.repository.UserRepository;
import io.smartpos.auth.infrastructure.email.EmailTemplateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class SendPasswordResetUseCase {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepo;
    private final VerificationEmailSender emailSender;
    private final EmailTemplateService templateService;

    @Value("${smartpos.verification.app-base-url:http://localhost:5173}")
    private String appBaseUrl;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final Duration TOKEN_TTL = Duration.ofHours(1);
    private static final Duration COOLDOWN = Duration.ofMinutes(2);
    private static final int MAX_TOKENS_PER_HOUR = 3;

    @Transactional
    public void send(String email) {
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No account found with this email"));

        // Rate limit: max 3 tokens per hour
        long recent = tokenRepo.countByUserIdAndUsedAtIsNullAndCreatedAtAfter(
                user.getId(), Instant.now().minus(1, ChronoUnit.HOURS));
        if (recent >= MAX_TOKENS_PER_HOUR) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Too many reset attempts. Please try again later.");
        }

        // Rate limit: cooldown between requests
        long veryRecent = tokenRepo.countByUserIdAndUsedAtIsNullAndCreatedAtAfter(
                user.getId(), Instant.now().minus(COOLDOWN));
        if (veryRecent > 0) {
            throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                    "Please wait 2 minutes between reset requests.");
        }

        String rawToken = generateToken(48);
        String tokenHash = sha256(rawToken);

        PasswordResetToken token = PasswordResetToken.builder()
                .userId(user.getId())
                .tokenHash(tokenHash)
                .expiresAt(Instant.now().plus(TOKEN_TTL))
                .build();
        tokenRepo.save(token);

        String resetUrl = appBaseUrl + "/auth/reset-password?token=" + rawToken;
        log.info("[DEV] Password reset URL: {}", resetUrl);

        String html = templateService.render("verify-email.html", Map.of(
                "heading", "Reset your password",
                "subheading", "Click the button below to set a new password for your Letis POS account.",
                "verify_url", resetUrl,
                "expiry_hours", "1",
                "cta_text", "Reset password",
                "cta_url", resetUrl,
                "footer_text", "This email was sent to " + email,
                "legal", "If you didn't request this, you can safely ignore this email."
        ));
        emailSender.sendVerificationEmail(email, "Reset your Letis POS password", html);
        log.info("Sent password reset email to {}", email);
    }

    private static String generateToken(int byteLength) {
        byte[] bytes = new byte[byteLength];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
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
