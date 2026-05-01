package io.smartpos.user.application;

import io.smartpos.user.api.dto.CreateRoleRequest;
import io.smartpos.user.api.dto.RoleDto;
import io.smartpos.user.domain.model.Permission;
import io.smartpos.user.domain.model.Role;
import io.smartpos.user.domain.repository.PermissionRepository;
import io.smartpos.user.domain.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoleService {

    private final RoleRepository roleRepo;
    private final PermissionRepository permRepo;

    @Transactional(readOnly = true)
    public List<RoleDto> list() {
        return roleRepo.findAll().stream().map(RoleDto::from).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<Permission> listAllPermissions() {
        return permRepo.findAll();
    }

    @Transactional
    public RoleDto create(CreateRoleRequest req) {
        if (roleRepo.findByNameIgnoreCase(req.name()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Role name already exists");
        }
        Set<Permission> perms = new HashSet<>();
        if (req.permissionIds() != null) perms.addAll(permRepo.findAllById(req.permissionIds()));
        Role role = Role.builder()
                .name(req.name())
                .label(req.label())
                .description(req.description())
                .permissions(perms)
                .build();
        return RoleDto.from(roleRepo.save(role));
    }

    @Transactional
    public RoleDto update(UUID id, CreateRoleRequest req) {
        Role role = roleRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role not found"));
        if (role.isSystem()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot modify a system role");
        }
        role.setName(req.name());
        role.setLabel(req.label());
        role.setDescription(req.description());
        if (req.permissionIds() != null) {
            role.setPermissions(new HashSet<>(permRepo.findAllById(req.permissionIds())));
        }
        return RoleDto.from(roleRepo.save(role));
    }

    @Transactional
    public void delete(UUID id) {
        Role role = roleRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role not found"));
        if (role.isSystem()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cannot delete a system role");
        }
        roleRepo.delete(role);
    }

    @Transactional
    public RoleDto setPermissions(UUID roleId, Set<UUID> permissionIds) {
        Role role = roleRepo.findById(roleId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Role not found"));
        role.setPermissions(new HashSet<>(permRepo.findAllById(permissionIds)));
        return RoleDto.from(roleRepo.save(role));
    }
}
