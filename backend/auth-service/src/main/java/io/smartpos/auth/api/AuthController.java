package io.smartpos.auth.api;

import io.smartpos.auth.api.dto.*;
import io.smartpos.auth.application.ChangePasswordUseCase;
import io.smartpos.auth.application.LoginUseCase;
import io.smartpos.auth.application.RegisterUserUseCase;
import io.smartpos.auth.application.ResetPasswordUseCase;
import io.smartpos.auth.application.SendPasswordResetUseCase;
import io.smartpos.auth.application.SendVerificationUseCase;
import io.smartpos.auth.application.VerifyUserUseCase;
import io.smartpos.auth.domain.model.User;
import io.smartpos.auth.domain.model.UserStatus;
import io.smartpos.auth.domain.model.VerificationChannel;
import io.smartpos.auth.domain.repository.UserRepository;
import io.smartpos.auth.infrastructure.security.RefreshTokenCookies;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final LoginUseCase loginUseCase;
    private final RegisterUserUseCase registerUseCase;
    private final ChangePasswordUseCase changePasswordUseCase;
    private final VerifyUserUseCase verifyUserUseCase;
    private final SendVerificationUseCase sendVerificationUseCase;
    private final SendPasswordResetUseCase sendPasswordResetUseCase;
    private final ResetPasswordUseCase resetPasswordUseCase;
    private final UserRepository userRepository;
    private final RefreshTokenCookies refreshCookies;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req, HttpServletRequest httpReq) {
        AuthResponse body = loginUseCase.login(req, httpReq.getHeader("User-Agent"), clientIp(httpReq));
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookies.attach(body.refreshToken()).toString())
                .body(body);
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @RequestBody(required = false) RefreshRequest req,
            HttpServletRequest httpReq) {
        String raw = coalesceRefresh(readCookie(httpReq, refreshCookies.name()), req);
        if (raw == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing refresh token");
        }
        AuthResponse body = loginUseCase.refresh(raw);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookies.attach(body.refreshToken()).toString())
                .body(body);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @RequestBody(required = false) RefreshRequest req,
            HttpServletRequest httpReq) {
        String raw = coalesceRefresh(readCookie(httpReq, refreshCookies.name()), req);
        loginUseCase.logout(raw);
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, refreshCookies.clear().toString())
                .build();
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterRequest req, HttpServletRequest httpReq) {
        User user = registerUseCase.register(req);

        // Phone-based channels need OTP verification before login.
        // Return the userId + channel so the frontend can show the OTP input screen.
        if (user.getStatus() == UserStatus.PENDING) {
            String channelStr = req.channel() != null ? req.channel().toUpperCase() : "EMAIL";
            VerificationChannel channel = VerificationChannel.valueOf(channelStr);
            String otp = sendVerificationUseCase.send(user, channel);
            // In dev we log the OTP so the user can test without a real phone.
            log.info("[DEV] {} OTP for user {}: {}", channel, user.getId(), otp);
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                    "userId", user.getId().toString(),
                    "channel", channel.name(),
                    "contact", channel == VerificationChannel.EMAIL
                            ? user.getEmail() : user.getPhoneNumber(),
                    "message", "Verification code sent via " + channel.name().toLowerCase()
            ));
        }

        AuthResponse body = loginUseCase.loginAfterRegistration(user, httpReq.getHeader("User-Agent"), clientIp(httpReq));
        return ResponseEntity.status(HttpStatus.CREATED)
                .header(HttpHeaders.SET_COOKIE, refreshCookies.attach(body.refreshToken()).toString())
                .body(body);
    }

    @PostMapping("/password/change")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@Valid @RequestBody ChangePasswordRequest req) {
        changePasswordUseCase.change(req.userId(), req.currentPassword(), req.newPassword());
    }

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
        User user;
        if (req.email() != null && !req.email().isBlank()) {
            user = userRepository.findByEmailIgnoreCase(req.email())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No account found with this email"));
        } else if (req.userId() != null) {
            user = userRepository.findById(req.userId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Either userId or email is required");
        }

        if (user.getStatus() == UserStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Account is already verified. Please log in.");
        }
        if (user.getStatus() == UserStatus.LOCKED) {
            throw new ResponseStatusException(HttpStatus.LOCKED, "Account is locked. Contact support.");
        }
        if (user.getStatus() == UserStatus.DISABLED) {
            throw new ResponseStatusException(HttpStatus.LOCKED, "Account is disabled. Contact your administrator.");
        }
        // PENDING — proceed with resend

        VerificationChannel channel;
        if (user.getEmail() != null) {
            channel = VerificationChannel.EMAIL;
        } else {
            // Phone-based users: prefer WHATSAPP if the sender is configured,
            // fall back to SMS (PHONE).  The WhatsAppOtpSender bean only exists
            // when smartpos.verification.whatsapp.access-token is set.
            channel = VerificationChannel.WHATSAPP;
        }
        sendVerificationUseCase.send(user, channel);
        return ResponseEntity.ok(Map.of("message", "Verification sent"));
    }

    @PostMapping("/password/forgot")
    public ResponseEntity<Map<String, String>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest req) {
        try {
            sendPasswordResetUseCase.send(req.email());
        } catch (Exception e) {
            // Don't reveal whether the email exists to the client, but log the real cause
            String cause = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            log.warn("Password reset failed for {}: {}", req.email(), cause);
        }
        return ResponseEntity.ok(Map.of("message", "If an account exists, a reset link has been sent."));
    }

    @PostMapping("/password/reset")
    public ResponseEntity<Map<String, String>> resetPassword(@Valid @RequestBody ResetPasswordRequest req) {
        String message = resetPasswordUseCase.reset(req.token(), req.password());
        return ResponseEntity.ok(Map.of("message", message));
    }

    private static String readCookie(HttpServletRequest req, String name) {
        if (req.getCookies() == null) {
            return null;
        }
        for (var c : req.getCookies()) {
            if (name.equals(c.getName())) {
                return c.getValue();
            }
        }
        return null;
    }

    private static String coalesceRefresh(String fromCookie, RefreshRequest req) {
        if (fromCookie != null && !fromCookie.isBlank()) {
            return fromCookie.trim();
        }
        if (req != null && req.refreshToken() != null && !req.refreshToken().isBlank()) {
            return req.refreshToken().trim();
        }
        return null;
    }

    private static String clientIp(HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return req.getRemoteAddr();
    }
}
