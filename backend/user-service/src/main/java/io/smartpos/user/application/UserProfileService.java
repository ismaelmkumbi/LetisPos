package io.smartpos.user.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.user.api.dto.UpdateUserRequest;
import io.smartpos.user.api.dto.UserDto;
import io.smartpos.user.domain.model.Role;
import io.smartpos.user.domain.model.UserOnboardingState;
import io.smartpos.user.domain.model.UserProfile;
import io.smartpos.user.domain.repository.RoleRepository;
import io.smartpos.user.domain.repository.UserOnboardingStateRepository;
import io.smartpos.user.domain.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserProfileService {

    private final UserProfileRepository userRepo;
    private final RoleRepository roleRepo;
    private final UserOnboardingStateRepository onboardingRepo;

    @Transactional(readOnly = true)
    public Page<UserDto> list(String search, Boolean active, Pageable pageable) {
        UUID tenantId = TenantContext.require();
        return userRepo.search(search, active, tenantId, pageable).map(UserDto::from);
    }

    @Transactional(readOnly = true)
    public List<UserDto> getBatch(List<UUID> ids) {
        return userRepo.findAllById(ids).stream().map(UserDto::from).toList();
    }

    @Transactional(readOnly = true)
    public UserDto get(UUID id) {
        UserProfile u = userRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        validateTenant(u);
        return UserDto.from(u);
    }

    /**
     * Creates a profile row for a user that was just registered in Auth Service.
     * Idempotent — safe to call from the event consumer (UserRegistered).
     *
     * The first user in a tenant gets ADMIN so they can manage the workspace.
     * Subsequent users get CASHIER as a safe default.
     */
    @Transactional
    public UserProfile createOrUpdateFromAuth(UUID userId, String email,
                                              String firstName, String lastName,
                                              UUID tenantId) {
        boolean isNew = !userRepo.existsById(userId);

        // Enforce plan maxUsers limit on new user creation
        if (isNew && tenantId != null) {
            int maxUsers = getMaxUsersFromJwt();
            long currentCount = userRepo.countByTenantId(tenantId);
            if (currentCount >= maxUsers) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "User limit reached. Your plan allows " + maxUsers
                        + " users. Upgrade to add more.");
            }
        }

        UserProfile profile = userRepo.findById(userId).orElseGet(() ->
                UserProfile.builder()
                        .id(userId)
                        .email(email)
                        .firstName(firstName)
                        .lastName(lastName)
                        .tenantId(tenantId)
                        .active(true)
                        .build());
        profile.setEmail(email);
        if (firstName != null && !firstName.isBlank()) profile.setFirstName(firstName);
        if (lastName != null && !lastName.isBlank()) profile.setLastName(lastName);

        // Assign default role to new registrations: ADMIN for the tenant creator,
        // CASHIER for everyone else in that workspace.
        if (isNew && profile.getRoles().isEmpty()) {
            boolean isFirstInTenant = tenantId != null && userRepo.countByTenantId(tenantId) == 0;
            String roleName = isFirstInTenant ? "ADMIN" : "CASHIER";
            roleRepo.findByNameIgnoreCase(roleName).ifPresent(role -> {
                profile.getRoles().add(role);
            });
        }

        UserProfile saved = userRepo.save(profile);

        if (isNew && !onboardingRepo.existsById(userId)) {
            onboardingRepo.save(UserOnboardingState.builder()
                    .userId(userId)
                    .workspaceCompleted(true)
                    .build());
        }

        return saved;
    }

    @Transactional
    public UserDto update(UUID id, UpdateUserRequest req) {
        UserProfile u = userRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        validateTenant(u);

        if (req.firstName() != null) u.setFirstName(req.firstName());
        if (req.lastName()  != null) u.setLastName(req.lastName());
        if (req.phone()     != null) u.setPhone(req.phone());
        if (req.address()   != null) u.setAddress(req.address());
        if (req.city()      != null) u.setCity(req.city());
        if (req.country()   != null) u.setCountry(req.country());
        if (req.isAllWarehouses() != null) u.setAllWarehouses(req.isAllWarehouses());
        if (req.active() != null) u.setActive(req.active());
        if (req.warehouseIds() != null) u.setWarehouseIds(new HashSet<>(req.warehouseIds()));
        if (req.roleIds() != null) {
            Set<Role> newRoles = new HashSet<>(roleRepo.findAllById(req.roleIds()));
            u.setRoles(newRoles);
        }
        return UserDto.from(userRepo.save(u));
    }

    @Transactional
    public void setStatus(UUID id, boolean active) {
        UserProfile u = userRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        validateTenant(u);
        u.setActive(active);
        userRepo.save(u);
    }

    @Transactional
    public void assignWarehouses(UUID id, Set<UUID> warehouseIds) {
        UserProfile u = userRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        validateTenant(u);
        u.setWarehouseIds(new HashSet<>(warehouseIds));
        userRepo.save(u);
    }

    private void validateTenant(UserProfile user) {
        UUID currentTenant = TenantContext.require();
        if (user.getTenantId() != null && !currentTenant.equals(user.getTenantId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found");
        }
    }

    /**
     * Reads the tenantMaxUsers claim from the current JWT.
     * Falls back to {@link Integer#MAX_VALUE} (no enforcement) when running
     * outside an HTTP request (e.g. Kafka consumer), so the primary enforcement
     * in auth-service's RegisterUserUseCase takes precedence.
     */
    private int getMaxUsersFromJwt() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
                Integer maxUsers = jwt.getClaim("tenantMaxUsers");
                if (maxUsers != null && maxUsers > 0) {
                    return maxUsers;
                }
            }
        } catch (Exception e) {
            log.debug("Could not read tenantMaxUsers from JWT: {}", e.getMessage());
        }
        return Integer.MAX_VALUE;
    }
}
