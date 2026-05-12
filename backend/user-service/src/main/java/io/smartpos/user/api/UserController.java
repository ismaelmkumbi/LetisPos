package io.smartpos.user.api;

import io.smartpos.user.api.dto.UpdateUserRequest;
import io.smartpos.user.api.dto.UserDto;
import io.smartpos.user.application.UserProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserProfileService userService;

    @GetMapping
    @PreAuthorize("hasAuthority('user.view')")
    public Page<UserDto> list(@RequestParam(required = false) String search,
                              @RequestParam(required = false) Boolean active,
                              Pageable pageable) {
        return userService.list(search, active, pageable);
    }

    @GetMapping("/batch")
    @PreAuthorize("hasAuthority('user.view')")
    public List<UserDto> getBatch(@RequestParam List<UUID> ids) {
        return userService.getBatch(ids);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('user.view') or #id.toString() == authentication.name")
    public UserDto get(@PathVariable UUID id) {
        return userService.get(id);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('user.update') or #id.toString() == authentication.name")
    public UserDto update(@PathVariable UUID id, @RequestBody UpdateUserRequest req) {
        return userService.update(id, req);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('user.update')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void setStatus(@PathVariable UUID id, @RequestBody Map<String, Boolean> body) {
        userService.setStatus(id, Boolean.TRUE.equals(body.get("active")));
    }

    @PutMapping("/{id}/warehouses")
    @PreAuthorize("hasAuthority('user.update')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void assignWarehouses(@PathVariable UUID id, @RequestBody Map<String, Set<UUID>> body) {
        userService.assignWarehouses(id, body.getOrDefault("warehouseIds", Set.of()));
    }
}
