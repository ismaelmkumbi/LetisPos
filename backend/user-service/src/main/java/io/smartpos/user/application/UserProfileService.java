package io.smartpos.user.application;

import io.smartpos.user.api.dto.UpdateUserRequest;
import io.smartpos.user.api.dto.UserDto;
import io.smartpos.user.domain.model.Role;
import io.smartpos.user.domain.model.UserProfile;
import io.smartpos.user.domain.repository.RoleRepository;
import io.smartpos.user.domain.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserProfileService {

    private final UserProfileRepository userRepo;
    private final RoleRepository roleRepo;

    @Transactional(readOnly = true)
    public Page<UserDto> list(String search, Boolean active, Pageable pageable) {
        return userRepo.search(search, active, pageable).map(UserDto::from);
    }

    @Transactional(readOnly = true)
    public UserDto get(UUID id) {
        return userRepo.findById(id).map(UserDto::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    /**
     * Creates a profile row for a user that was just registered in Auth Service.
     * Idempotent — safe to call from the event consumer (UserRegistered).
     */
    @Transactional
    public UserProfile createOrUpdateFromAuth(UUID userId, String email,
                                              String firstName, String lastName,
                                              UUID tenantId) {
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
        return userRepo.save(profile);
    }

    @Transactional
    public UserDto update(UUID id, UpdateUserRequest req) {
        UserProfile u = userRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

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
        u.setActive(active);
        userRepo.save(u);
    }

    @Transactional
    public void assignWarehouses(UUID id, Set<UUID> warehouseIds) {
        UserProfile u = userRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        u.setWarehouseIds(new HashSet<>(warehouseIds));
        userRepo.save(u);
    }
}
