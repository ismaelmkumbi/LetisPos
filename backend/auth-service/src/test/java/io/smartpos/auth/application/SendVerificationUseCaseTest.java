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
import io.smartpos.auth.infrastructure.sms.TwilioConfig;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
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
    @Mock private TwilioConfig twilioConfig;
    private SendVerificationUseCase useCase;

    private static final String FROM = "onboarding@resend.dev";
    private static final String BASE_URL = "https://app.smartpos.local";

    @BeforeEach
    void setUp() {
        useCase = new SendVerificationUseCase(tokenRepo, resend, FROM, BASE_URL, twilioConfig);
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
        when(twilioConfig.getPhoneNumber()).thenReturn("+15551234567");

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
