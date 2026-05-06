package io.smartpos.auth.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.smartpos.auth.api.dto.RegisterRequest;
import io.smartpos.auth.domain.model.OutboxEvent;
import io.smartpos.auth.domain.model.Tenant;
import io.smartpos.auth.domain.model.User;
import io.smartpos.auth.domain.model.UserStatus;
import io.smartpos.auth.domain.repository.OutboxRepository;
import io.smartpos.auth.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class RegisterUserUseCase {

    private final UserRepository userRepository;
    private final OutboxRepository outboxRepository;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;
    private final TenantService tenantService;

    @Transactional
    public UUID register(RegisterRequest req) {
        if (userRepository.existsByEmailIgnoreCase(req.email())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }

        // Resolve tenant: explicit tenantId, auto-create from tenantName, or leave null
        UUID tenantId = req.tenantId();
        Tenant tenant = null;
        if (tenantId == null && req.tenantName() != null && !req.tenantName().isBlank()) {
            tenant = tenantService.create(req.tenantName(), req.tenantSlug(), null);
            tenantId = tenant.getId();
        }

        User user = User.builder()
                .email(req.email().toLowerCase())
                .username(req.username())
                .passwordHash(passwordEncoder.encode(req.password()))
                .status(UserStatus.ACTIVE)
                .tenantId(tenantId)
                .build();
        try {
            user = userRepository.save(user);
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email already registered");
        }

        // Emit UserRegistered event via outbox so User Service can create a profile.
        publishUserRegistered(user, req);

        log.info("Registered user id={} email={} tenantId={}", user.getId(), user.getEmail(), tenantId);
        return user.getId();
    }

    private void publishUserRegistered(User user, RegisterRequest req) {
        try {
            String payload = objectMapper.writeValueAsString(Map.of(
                    "userId",    user.getId(),
                    "email",     user.getEmail(),
                    "username",  user.getUsername() == null ? "" : user.getUsername(),
                    "firstName", req.firstName() == null ? "" : req.firstName(),
                    "lastName",  req.lastName() == null ? "" : req.lastName(),
                    "tenantId",  user.getTenantId() == null ? "" : user.getTenantId().toString()
            ));
            OutboxEvent event = OutboxEvent.builder()
                    .aggregateType("User")
                    .aggregateId(user.getId())
                    .eventType("UserRegistered")
                    .payload(payload)
                    .build();
            outboxRepository.save(event);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize UserRegistered event", e);
        }
    }
}
