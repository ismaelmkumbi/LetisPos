package io.smartpos.auth.application;

import io.smartpos.auth.domain.model.User;
import io.smartpos.auth.domain.model.VerificationChannel;
import io.smartpos.auth.domain.model.VerificationToken;
import io.smartpos.auth.domain.repository.VerificationTokenRepository;
import io.smartpos.auth.infrastructure.email.EmailTemplateService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class SendVerificationUseCase {

    private final VerificationTokenRepository tokenRepo;
    private final VerificationEmailSender emailSender;
    private final VerificationSmsSender smsSender;
    private final EmailTemplateService templateService;

    @Value("${smartpos.verification.app-base-url:https://letispos.com}")
    private String appBaseUrl;

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final Duration EMAIL_TTL = Duration.ofHours(24);
    private static final Duration PHONE_TTL = Duration.ofMinutes(10);
    private static final Duration RESEND_COOLDOWN = Duration.ofSeconds(60);
    private static final int MAX_TOKENS = 5;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
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

        return channel == VerificationChannel.PHONE ? otp : rawToken;
    }

    private void sendEmail(String to, String rawToken) {
        String verifyUrl = appBaseUrl + "/auth/verify?token=" + rawToken;
        String html = templateService.render("verify-email.html", Map.of(
                "heading", "Verify your account",
                "subheading", "One click to activate your Letis POS workspace",
                "verify_url", verifyUrl,
                "expiry_hours", "24",
                "cta_text", "Verify account",
                "cta_url", verifyUrl,
                "footer_text", "This email was sent to " + to,
                "legal", "Letis POS. You received this email because you created an account. If you didn't, you can safely ignore it."
        ));
        emailSender.sendVerificationEmail(to, "Verify your Letis POS account", html);
    }

    private void sendSms(String to, String otp) {
        smsSender.sendVerificationSms(to,
                "Your SmartPOS verification code is: " + otp + ". It expires in 10 minutes.");
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
