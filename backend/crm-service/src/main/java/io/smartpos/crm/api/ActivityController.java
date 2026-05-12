package io.smartpos.crm.api;

import io.smartpos.crm.domain.model.Activity;
import io.smartpos.crm.domain.repository.ActivityRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/crm/activities")
@RequiredArgsConstructor
public class ActivityController {

    private final ActivityRepository activityRepo;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<Activity>> list(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<Activity> result = (type != null && !type.isBlank())
                ? activityRepo.findByTenantIdAndType(tenantId, type, pageable)
                : activityRepo.findByTenantIdOrderByCreatedAtDesc(tenantId, pageable);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Activity> get(@RequestHeader("X-Tenant-ID") UUID tenantId, @PathVariable UUID id) {
        Activity activity = activityRepo.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Activity not found: " + id));
        if (!activity.getTenantId().equals(tenantId)) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(activity);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('crm.manage')")
    public ResponseEntity<Activity> create(@RequestHeader("X-Tenant-ID") UUID tenantId, @RequestBody @Valid Activity body) {
        body.setId(null);
        body.setTenantId(tenantId);
        return ResponseEntity.status(HttpStatus.CREATED).body(activityRepo.save(body));
    }
}
