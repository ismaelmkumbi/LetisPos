package io.smartpos.auth.application;

import io.smartpos.auth.domain.model.User;
import io.smartpos.auth.domain.model.UserStatus;
import io.smartpos.auth.domain.model.VerificationChannel;
import io.smartpos.auth.domain.model.VerificationToken;
import io.smartpos.auth.domain.repository.UserRepository;
import io.smartpos.auth.domain.repository.VerificationTokenRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Slf4j
@Service
@RequiredArgsConstructor
public class VerifyUserUseCase {

    private final VerificationTokenRepository tokenRepo;
    private final UserRepository userRepo;

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

        return token.getChannel() == VerificationChannel.PHONE
                ? user.getPhoneNumber()
                : user.getEmail();
    }
}
