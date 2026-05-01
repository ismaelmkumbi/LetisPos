package io.smartpos.hrm.api;

import io.smartpos.hrm.api.dto.LeaveRequestDto;
import io.smartpos.hrm.application.LeaveService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/leave-requests")
@RequiredArgsConstructor
public class LeaveController {

    private final LeaveService service;

    @GetMapping("/by-employee/{employeeId}")
    @PreAuthorize("hasAuthority('hrm.view')")
    public Page<LeaveRequestDto> forEmployee(@PathVariable UUID employeeId, Pageable pageable) {
        return service.listForEmployee(employeeId, pageable);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('hrm.leave.request')")
    public ResponseEntity<LeaveRequestDto> create(@Valid @RequestBody LeaveRequestDto.CreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @PostMapping("/{id}/decision")
    @PreAuthorize("hasAuthority('hrm.leave.approve')")
    public LeaveRequestDto decide(@PathVariable UUID id,
                                  @Valid @RequestBody LeaveRequestDto.DecisionRequest decision,
                                  @AuthenticationPrincipal Jwt jwt) {
        UUID approverId = (jwt == null) ? null : safeUuid(jwt.getSubject());
        return service.decide(id, decision, approverId);
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAuthority('hrm.leave.request')")
    public LeaveRequestDto cancel(@PathVariable UUID id) { return service.cancel(id); }

    private UUID safeUuid(String s) {
        try { return UUID.fromString(s); } catch (Exception ignored) { return null; }
    }
}
