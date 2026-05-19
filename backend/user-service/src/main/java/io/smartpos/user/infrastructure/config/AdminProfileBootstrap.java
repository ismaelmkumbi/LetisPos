package io.smartpos.user.infrastructure.config;

import io.smartpos.user.domain.model.Role;
import io.smartpos.user.domain.model.UserProfile;
import io.smartpos.user.domain.repository.RoleRepository;
import io.smartpos.user.domain.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/**
 * TEMPORARY: until the UserRegistered event consumer is wired in Phase 1b,
 * we bootstrap an admin profile here that matches the admin seeded by Auth Service.
 *
 * In production this is replaced by consuming the UserRegistered outbox event.
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class AdminProfileBootstrap {

    private static final UUID ADMIN_ROLE_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");

    @Bean
    public ApplicationRunner seedAdminProfile(UserProfileRepository userRepo,
                                              RoleRepository roleRepo,
                                              @Value("${smartpos.user.bootstrap.admin-email:admin@smartpos.local}") String adminEmail,
                                              @Value("${smartpos.user.bootstrap.admin-user-id:}") String adminUserId) {
        return args -> {
            if (adminUserId == null || adminUserId.isBlank()) {
                log.info("No admin-user-id configured; skipping admin profile bootstrap. " +
                         "Set smartpos.user.bootstrap.admin-user-id to the UUID printed by Auth Service.");
                return;
            }
            UUID id = UUID.fromString(adminUserId);
            if (userRepo.existsById(id)) {
                log.info("Admin profile already present for id={}", id);
                return;
            }
            if (userRepo.findByEmailIgnoreCase(adminEmail).isPresent()) {
                log.warn("Admin profile already exists for email={} but with different id; "
                         + "skipping bootstrap — update SMARTPOS_USER_BOOTSTRAP_ADMIN_USER_ID "
                         + "to match the existing profile or remove the duplicate",
                         adminEmail);
                return;
            }
            Role admin = roleRepo.findById(ADMIN_ROLE_ID).orElseThrow();
            UserProfile profile = UserProfile.builder()
                    .id(id)
                    .email(adminEmail)
                    .firstName("System")
                    .lastName("Administrator")
                    .allWarehouses(true)
                    .active(true)
                    .roles(new HashSet<>(Set.of(admin)))
                    .warehouseIds(new HashSet<>())
                    .build();
            userRepo.save(profile);
            log.warn("Seeded admin profile id={} email={}", id, adminEmail);
        };
    }
}
