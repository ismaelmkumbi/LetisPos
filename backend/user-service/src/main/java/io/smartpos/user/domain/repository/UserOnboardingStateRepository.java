package io.smartpos.user.domain.repository;

import io.smartpos.user.domain.model.UserOnboardingState;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface UserOnboardingStateRepository extends JpaRepository<UserOnboardingState, UUID> {
}
