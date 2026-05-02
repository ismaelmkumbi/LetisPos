package io.smartpos.user.api;

import io.smartpos.user.api.dto.CreateRoleRequest;
import io.smartpos.user.api.dto.RoleDto;
import io.smartpos.user.application.RoleService;
import io.smartpos.user.domain.model.Permission;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class RoleController {

    private final RoleService roleService;

    @GetMapping("/roles")
    @PreAuthorize("hasAuthority('role.view')")
    public List<RoleDto> list() { return roleService.list(); }

    @PostMapping("/roles")
    @PreAuthorize("hasAuthority('role.manage')")
    public ResponseEntity<RoleDto> create(@Valid @RequestBody CreateRoleRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(roleService.create(req));
    }

    @PutMapping("/roles/{id}")
    @PreAuthorize("hasAuthority('role.manage')")
    public RoleDto update(@PathVariable UUID id, @Valid @RequestBody CreateRoleRequest req) {
        return roleService.update(id, req);
    }

    @DeleteMapping("/roles/{id}")
    @PreAuthorize("hasAuthority('role.manage')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) { roleService.delete(id); }

    @PutMapping("/roles/{id}/permissions")
    @PreAuthorize("hasAuthority('role.manage')")
    public RoleDto setPermissions(@PathVariable UUID id, @RequestBody Map<String, Set<UUID>> body) {
        return roleService.setPermissions(id, body.getOrDefault("permissionIds", Set.of()));
    }

    @GetMapping("/permissions")
    @PreAuthorize("hasAuthority('role.view')")
    public List<Permission> permissions() { return roleService.listAllPermissions(); }
}
