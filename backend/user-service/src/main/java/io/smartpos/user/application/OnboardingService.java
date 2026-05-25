package io.smartpos.user.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.user.api.dto.OnboardingStateDto;
import io.smartpos.user.api.dto.OnboardingProgressRequest;
import io.smartpos.user.domain.model.UserOnboardingState;
import io.smartpos.user.domain.model.UserProfile;
import io.smartpos.user.domain.repository.UserOnboardingStateRepository;
import io.smartpos.user.domain.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OnboardingService {

    private final UserOnboardingStateRepository onboardingRepo;
    private final UserProfileRepository userRepo;

    @Transactional(readOnly = true)
    public OnboardingStateDto getState(UUID userId) {
        UserProfile profile = userRepo.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        validateTenant(profile);

        UserOnboardingState state = onboardingRepo.findById(userId)
                .orElseGet(() -> createDefaultState(userId));

        // Auto-detect staff completion: more than 1 user in tenant means staff invited
        if (!state.isStaffCompleted()) {
            Long tenantUserCount = userRepo.countByTenantId(profile.getTenantId());
            if (tenantUserCount != null && tenantUserCount > 1) {
                state.setStaffCompleted(true);
                onboardingRepo.save(state);
            }
        }

        return OnboardingStateDto.from(state);
    }

    @Transactional
    public OnboardingStateDto updateStep(UUID userId, OnboardingProgressRequest req) {
        UserProfile profile = userRepo.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        validateTenant(profile);

        UserOnboardingState state = onboardingRepo.findById(userId)
                .orElseGet(() -> createDefaultState(userId));

        boolean completed = Boolean.TRUE.equals(req.completed());
        switch (req.step()) {
            case "workspace" -> state.setWorkspaceCompleted(completed);
            case "warehouse" -> state.setWarehouseCompleted(completed);
            case "tax" -> state.setTaxCompleted(completed);
            case "products" -> state.setProductsCompleted(completed);
            case "staff" -> state.setStaffCompleted(completed);
            case "first_sale" -> state.setFirstSaleCompleted(completed);
            case "brand" -> state.setBrandCompleted(completed);
            case "document_theme" -> state.setDocumentThemeCompleted(completed);
            default -> throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Unknown onboarding step: " + req.step());
        }

        // Trigger completion check
        if (state.isComplete() && state.getCompletedAt() == null) {
            state.setCompletedAt(java.time.Instant.now());
        } else if (!state.isComplete()) {
            state.setCompletedAt(null);
        }

        onboardingRepo.save(state);
        return OnboardingStateDto.from(state);
    }

    @Transactional
    public UserOnboardingState createDefaultState(UUID userId) {
        UserOnboardingState state = UserOnboardingState.builder()
                .userId(userId)
                .workspaceCompleted(true)
                .build();
        return onboardingRepo.save(state);
    }

    private void validateTenant(UserProfile profile) {
        UUID currentTenant = TenantContext.get().orElse(null);
        if (currentTenant == null) return; // admin — no tenant scoping
        if (profile.getTenantId() != null && !currentTenant.equals(profile.getTenantId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
        }
    }
}
