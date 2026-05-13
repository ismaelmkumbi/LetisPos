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
                .isInstanceOf(ResponseStatusException.class)
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
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("expired");
    }

    @Test
    void shouldRejectInvalidToken() {
        when(tokenRepo.findByTokenHash(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> useCase.verify("bad-token"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Invalid verification");
    }

    @Test
    void shouldVerifyPhoneOtpCorrectly() {
        User user = pendingUser();
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
    void shouldRejectWrongPhoneOtp() {
        when(tokenRepo.findByTokenHash(any())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> useCase.verify("999999"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Invalid verification");
    }

    @Test
    void shouldRejectAlreadyVerifiedUser() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("test@example.com");
        user.setStatus(UserStatus.ACTIVE);
        user.setCreatedAt(Instant.now());

        VerificationToken token = validToken(user.getId(), VerificationChannel.EMAIL);
        when(tokenRepo.findByTokenHash(any())).thenReturn(Optional.of(token));
        when(userRepo.findById(user.getId())).thenReturn(Optional.of(user));

        assertThatThrownBy(() -> useCase.verify("raw-token"))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("already verified");
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
