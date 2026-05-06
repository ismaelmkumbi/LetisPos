package io.smartpos.user.api.dto;

import io.smartpos.user.domain.model.UserOnboardingState;

import java.time.Instant;

public record OnboardingStateDto(
        boolean workspace,
        boolean warehouse,
        boolean tax,
        boolean products,
        boolean staff,
        boolean firstSale,
        int percent,
        boolean isComplete,
        Instant completedAt
) {
    public static OnboardingStateDto from(UserOnboardingState s) {
        return new OnboardingStateDto(
                s.isWorkspaceCompleted(),
                s.isWarehouseCompleted(),
                s.isTaxCompleted(),
                s.isProductsCompleted(),
                s.isStaffCompleted(),
                s.isFirstSaleCompleted(),
                s.completionPercent(),
                s.isComplete(),
                s.getCompletedAt()
        );
    }
}
