package io.smartpos.auth.infrastructure.config;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.smartpos.auth.domain.model.OutboxEvent;
import io.smartpos.auth.domain.model.User;
import io.smartpos.auth.domain.model.UserStatus;
import io.smartpos.auth.domain.repository.OutboxRepository;
import io.smartpos.auth.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Map;

/**
 * Seeds an initial admin user on first startup when the users table is empty.
 * Credentials come from {@link BootstrapProperties} (env-overridable).
 *
 * Also publishes a {@code UserRegistered} outbox event so user-service's
 * profile projection stays in sync (otherwise the bootstrap admin would only
 * exist in auth_db and subsequent calls to {@code /users/{id}} would 404).
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class AdminBootstrap {

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
            User admin = User.builder()
                    .email(props.adminEmail().toLowerCase())
                    .passwordHash(passwordEncoder.encode(props.adminPassword()))
                    .status(UserStatus.ACTIVE)
                    .build();
            admin = userRepository.save(admin);

            publishUserRegistered(admin, outboxRepository, objectMapper);

            log.warn("""

                    ===============================================================
                    Bootstrap admin created (change password after first login!)
                      userId   : {}
                      email    : {}
                      password : {}
                    ===============================================================
                    """, admin.getId(), admin.getEmail(), props.adminPassword());
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
