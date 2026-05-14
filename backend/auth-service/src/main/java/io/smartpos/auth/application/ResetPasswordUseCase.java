package io.smartpos.auth.application;

import io.smartpos.auth.domain.model.PasswordResetToken;
import io.smartpos.auth.domain.model.User;
import io.smartpos.auth.domain.model.UserStatus;
import io.smartpos.auth.domain.repository.PasswordResetTokenRepository;
import io.smartpos.auth.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;

@Service
@RequiredArgsConstructor
@Slf4j
public class ResetPasswordUseCase {

    private final PasswordResetTokenRepository tokenRepo;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public void reset(String rawToken, String newPassword) {
        String tokenHash = SendPasswordResetUseCase.sha256(rawToken);
        PasswordResetToken token = tokenRepo
                .findByTokenHashAndUsedAtIsNullAndExpiresAtAfter(tokenHash, Instant.now())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Invalid or expired reset link. Please request a new one."));

        User user = userRepository.findById(token.getUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (newPassword == null || newPassword.length() < 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Password must be at least 8 characters");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));

        // Auto-verify: clicking the reset link proves email ownership
        if (user.getStatus() == UserStatus.PENDING) {
            user.setStatus(UserStatus.ACTIVE);
            log.info("User {} auto-verified via password reset", user.getId());
        }

        userRepository.save(user);

        token.setUsedAt(Instant.now());
        tokenRepo.save(token);

        log.info("Password reset for user {}", user.getId());
    }
}
