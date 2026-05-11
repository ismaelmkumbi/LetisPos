package io.smartpos.auth.api;

import io.smartpos.auth.api.dto.CloseRequest;
import io.smartpos.auth.api.dto.SuspendRequest;
import io.smartpos.auth.application.TenantService;
import io.smartpos.auth.domain.model.Tenant;
import io.smartpos.auth.domain.model.User;
import io.smartpos.auth.domain.repository.UserRepository;
import io.smartpos.auth.infrastructure.security.JwtTokenService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/tenants")
@RequiredArgsConstructor
public class TenantController {

    private final TenantService tenantService;
    private final JwtTokenService jwtTokenService;
    private final UserRepository userRepository;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Tenant create(@RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        String slug = (String) body.get("slug");
        String planStr = (String) body.get("billingPlan");
        io.smartpos.auth.domain.model.BillingPlan plan = null;
        if (planStr != null && !planStr.isBlank()) {
            plan = io.smartpos.auth.domain.model.BillingPlan.valueOf(planStr.toUpperCase());
        }
        if (name == null || name.isBlank()) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "name is required");
        }
        return tenantService.create(name, slug, plan);
    }

    @GetMapping
    public List<Tenant> list(@RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = currentUser(authHeader);
        if (user.getTenantId() == null) {
            return List.of();
        }
        return List.of(tenantService.getById(user.getTenantId()));
    }

    @GetMapping("/{id}")
    public Tenant get(@PathVariable UUID id,
                      @RequestHeader(value = "Authorization", required = false) String authHeader) {
        User user = currentUser(authHeader);
        if (user.getTenantId() == null || !user.getTenantId().equals(id)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Tenant is not related to this user");
        }
        return tenantService.getById(id);
    }

    @PatchMapping("/{id}")
    public Tenant update(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        java.util.Optional<String> name = java.util.Optional.ofNullable((String) body.get("name"));
        @SuppressWarnings("unchecked")
        java.util.Optional<String> slug = java.util.Optional.ofNullable((String) body.get("slug"));
        java.util.Optional<io.smartpos.auth.domain.model.BillingPlan> plan = java.util.Optional.empty();
        String planStr = (String) body.get("billingPlan");
        if (planStr != null && !planStr.isBlank()) {
            plan = java.util.Optional.of(io.smartpos.auth.domain.model.BillingPlan.valueOf(planStr.toUpperCase()));
        }
        return tenantService.update(id, name, slug, plan);
    }

    @GetMapping("/admin/all")
    @PreAuthorize("hasAuthority('admin')")
    public ResponseEntity<List<Tenant>> listAll() {
        return ResponseEntity.ok(tenantService.listAll());
    }

    @PostMapping("/{id}/suspend")
    @PreAuthorize("hasAuthority('tenant.suspend')")
    public ResponseEntity<Tenant> suspend(
            @PathVariable UUID id,
            @RequestBody @Valid SuspendRequest request) {
        return ResponseEntity.ok(tenantService.suspend(id, request.reason()));
    }

    @PostMapping("/{id}/reactivate")
    @PreAuthorize("hasAuthority('tenant.suspend')")
    public ResponseEntity<Tenant> reactivate(@PathVariable UUID id) {
        return ResponseEntity.ok(tenantService.reactivate(id));
    }

    @PostMapping("/{id}/close")
    @PreAuthorize("hasAuthority('tenant.suspend')")
    public ResponseEntity<Tenant> close(
            @PathVariable UUID id,
            @RequestBody @Valid CloseRequest request) {
        return ResponseEntity.ok(tenantService.close(id, request.reason()));
    }

    private User currentUser(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "Missing Bearer token");
        }
        String token = authHeader.substring(7);
        String sub;
        try {
            sub = jwtTokenService.parseSubject(token);
        } catch (Exception e) {
            throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.UNAUTHORIZED, "Invalid token");
        }
        return userRepository.findById(UUID.fromString(sub))
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        HttpStatus.NOT_FOUND, "User not found"));
    }
}
