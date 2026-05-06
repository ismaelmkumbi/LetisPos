package io.smartpos.user.api;

import io.smartpos.user.api.dto.OnboardingProgressRequest;
import io.smartpos.user.api.dto.OnboardingStateDto;
import io.smartpos.user.application.OnboardingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users/me/onboarding")
@RequiredArgsConstructor
public class OnboardingController {

    private final OnboardingService onboardingService;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public OnboardingStateDto getMyOnboarding(Authentication authentication) {
        UUID userId = UUID.fromString(authentication.getName());
        return onboardingService.getState(userId);
    }

    @PatchMapping
    @PreAuthorize("isAuthenticated()")
    public OnboardingStateDto updateStep(Authentication authentication,
                                         @Valid @RequestBody OnboardingProgressRequest req) {
        UUID userId = UUID.fromString(authentication.getName());
        return onboardingService.updateStep(userId, req);
    }
}
