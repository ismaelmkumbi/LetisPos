package io.smartpos.auth.infrastructure.config;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.smartpos.auth.application.TenantService;
import io.smartpos.auth.domain.model.OutboxEvent;
import io.smartpos.auth.domain.model.Tenant;
import io.smartpos.auth.domain.model.User;
import io.smartpos.auth.domain.model.UserStatus;
import io.smartpos.auth.domain.repository.OutboxRepository;
import io.smartpos.auth.domain.repository.TenantRepository;
import io.smartpos.auth.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Map;

/**
 * Seeds an initial admin user and default tenant on first startup.
 * Credentials come from {@link BootstrapProperties} (env-overridable).
 *
 * Also publishes a {@code UserRegistered} outbox event so user-service's
 * profile projection stays in sync.
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class AdminBootstrap {

    private final TenantRepository tenantRepository;

    @Bean
    public ApplicationRunner adminBootstrapRunner(UserRepository userRepository,
                                                  OutboxRepository outboxRepository,
                                                  PasswordEncoder passwordEncoder,
                                                  ObjectMapper objectMapper,
                                                  BootstrapProperties props) {
        return args -> {
            if (userRepository.count() > 0) {
                log.info("Users already exist — skipping admin bootstrap");
                return;
            }

            // Create default tenant so the bootstrap admin has a workspace
            Tenant defaultTenant = tenantRepository.findBySlugIgnoreCase("default").orElseGet(() -> {
                Tenant t = Tenant.builder()
                        .name("Default Workspace")
                        .slug("default")
                        .status(io.smartpos.auth.domain.model.TenantStatus.ACTIVE)
                        .billingPlan(io.smartpos.auth.domain.model.BillingPlan.ENTERPRISE)
                        .maxUsers(Integer.MAX_VALUE)
                        .maxStores(Integer.MAX_VALUE)
                        .settings("{}")
                        .build();
                return tenantRepository.save(t);
            });
            log.info("Default tenant ready: id={} slug={}", defaultTenant.getId(), defaultTenant.getSlug());

            User admin = User.builder()
                    .email(props.adminEmail().toLowerCase())
                    .passwordHash(passwordEncoder.encode(props.adminPassword()))
                    .status(UserStatus.ACTIVE)
                    .tenantId(defaultTenant.getId())
                    .build();
            admin = userRepository.save(admin);

            publishUserRegistered(admin, outboxRepository, objectMapper);

            log.warn("""

                    ===============================================================
                    Bootstrap admin created (change password after first login!)
                      userId   : {}
                      email    : {}
                      password : {}
                      tenantId : {}
                    ===============================================================
                    """, admin.getId(), admin.getEmail(), props.adminPassword(), defaultTenant.getId());
        };
    }

    /**
     * Writes a UserRegistered event to the outbox. The outbox-relay lib picks
     * it up and publishes to {@code smartpos.auth.user-registered.v1} which
     * user-service's consumer uses to materialise the user_profiles row.
     */
    private void publishUserRegistered(User admin,
                                       OutboxRepository outboxRepository,
                                       ObjectMapper objectMapper) {
        try {
            String payload = objectMapper.writeValueAsString(Map.of(
                    "userId",    admin.getId(),
                    "email",     admin.getEmail(),
                    "username",  "",
                    "firstName", "System",
                    "lastName",  "Admin",
                    "tenantId",  admin.getTenantId() == null ? "" : admin.getTenantId().toString()
            ));
            OutboxEvent event = OutboxEvent.builder()
                    .aggregateType("User")
                    .aggregateId(admin.getId())
                    .eventType("UserRegistered")
                    .payload(payload)
                    .build();
            outboxRepository.save(event);
            log.info("Published UserRegistered event for bootstrap admin {}", admin.getId());
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize bootstrap UserRegistered event", e);
        }
    }
}
