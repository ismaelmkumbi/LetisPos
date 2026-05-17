package io.smartpos.auth.api;

import io.smartpos.auth.domain.model.User;
import io.smartpos.auth.domain.model.UserStatus;
import io.smartpos.auth.domain.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserRepository userRepository;

    /** Search all users across all tenants — admin only. */
    @GetMapping("/users")
    @PreAuthorize("hasAuthority('admin')")
    public ResponseEntity<Page<Map<String, Object>>> searchUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) UUID tenantId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Page<User> users;
        Sort sort = Sort.by("createdAt").descending();
        PageRequest pageable = PageRequest.of(page, size, sort);

        if (tenantId != null) {
            users = userRepository.findByTenantId(tenantId, pageable);
        } else if (search != null && !search.isBlank()) {
            users = userRepository.findByEmailContainingIgnoreCase(search, pageable);
        } else {
            users = userRepository.findAll(pageable);
        }

        var result = users.map(u -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", u.getId());
            m.put("email", u.getEmail());
            m.put("status", u.getStatus().name());
            m.put("tenantId", u.getTenantId());
            m.put("createdAt", u.getCreatedAt());
            return m;
        });

        return ResponseEntity.ok(result);
    }

    /** Soft-delete a user — admin only. */
    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasAuthority('admin')")
    public ResponseEntity<Void> softDeleteUser(@PathVariable UUID id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                HttpStatus.NOT_FOUND, "User not found"));
        if (user.getStatus() == UserStatus.DELETED) {
            throw new org.springframework.web.server.ResponseStatusException(
                HttpStatus.CONFLICT, "User is already deleted");
        }
        user.setStatus(UserStatus.DELETED);
        userRepository.save(user);
        return ResponseEntity.noContent().build();
    }

    /** Hard-delete a user — admin only, only on already-soft-deleted users. */
    @DeleteMapping("/users/{id}/hard")
    @PreAuthorize("hasAuthority('admin')")
    public ResponseEntity<Void> hardDeleteUser(@PathVariable UUID id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                HttpStatus.NOT_FOUND, "User not found"));
        if (user.getStatus() != UserStatus.DELETED) {
            throw new org.springframework.web.server.ResponseStatusException(
                HttpStatus.CONFLICT, "User must be soft-deleted first before hard delete");
        }
        userRepository.delete(user);
        return ResponseEntity.noContent().build();
    }
}
