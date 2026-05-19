package io.smartpos.user.api;

import io.smartpos.user.application.FeatureResolutionService;
import io.smartpos.user.domain.model.FeatureAssignment;
import io.smartpos.user.domain.model.FeatureAssignment.AssignmentLevel;
import io.smartpos.user.domain.model.FeatureDefinition;
import io.smartpos.user.domain.model.FeatureDefinitionRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin/features")
@RequiredArgsConstructor
public class FeatureController {

    private final FeatureDefinitionRepository featureRepository;
    private final FeatureResolutionService resolutionService;

    @GetMapping
    @PreAuthorize("hasAuthority('admin')")
    public List<FeatureDefinition> listAll() {
        return resolutionService.getActiveFeatures();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('admin')")
    public ResponseEntity<FeatureDefinition> create(@Valid @RequestBody CreateFeatureRequest body) {
        FeatureDefinition feature = FeatureDefinition.builder()
            .key(body.key())
            .label(body.label())
            .description(body.description())
            .category(body.category())
            .sortOrder(body.sortOrder())
            .build();
        FeatureDefinition saved = featureRepository.save(feature);
        return ResponseEntity.created(URI.create("/api/v1/admin/features/" + saved.getId())).body(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('admin')")
    public FeatureDefinition update(@PathVariable UUID id, @Valid @RequestBody UpdateFeatureRequest body) {
        FeatureDefinition existing = featureRepository.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Feature not found: " + id));
        existing.setLabel(body.label());
        existing.setDescription(body.description());
        existing.setCategory(body.category());
        existing.setSortOrder(body.sortOrder());
        existing.setActive(body.active());
        return featureRepository.save(existing);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('admin')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        FeatureDefinition feature = featureRepository.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Feature not found: " + id));
        feature.setActive(false);
        featureRepository.save(feature);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/assignments")
    @PreAuthorize("hasAuthority('admin')")
    public List<FeatureAssignment> listAssignments(
            @RequestParam(required = false) AssignmentLevel level,
            @RequestParam(required = false) String targetId) {
        if (level != null && targetId != null) {
            return resolutionService.getAssignmentsByLevelAndTarget(level, targetId);
        }
        return resolutionService.getAllAssignments();
    }

    @PostMapping("/assignments")
    @PreAuthorize("hasAuthority('admin')")
    public FeatureAssignment createAssignment(@Valid @RequestBody CreateAssignmentRequest body,
                                               Authentication auth) {
        UUID createdBy = UUID.fromString(auth.getName());
        FeatureAssignment saved = resolutionService.assignFeature(
            body.featureKey(), body.assignmentLevel(), body.targetId(), body.granted(), createdBy);
        switch (body.assignmentLevel()) {
            case PLAN -> resolutionService.evictPlanCache(body.targetId());
            case TENANT -> resolutionService.evictTenantCache(body.targetId());
            case USER -> resolutionService.evictUserCache(body.targetId());
        }
        return saved;
    }

    @DeleteMapping("/assignments/{id}")
    @PreAuthorize("hasAuthority('admin')")
    public ResponseEntity<Void> deleteAssignment(@PathVariable UUID id) {
        FeatureAssignment assignment = resolutionService.getAssignmentById(id);
        resolutionService.removeAssignment(assignment.getFeatureKey(),
            assignment.getAssignmentLevel(), assignment.getTargetId());
        switch (assignment.getAssignmentLevel()) {
            case PLAN -> resolutionService.evictPlanCache(assignment.getTargetId());
            case TENANT -> resolutionService.evictTenantCache(assignment.getTargetId());
            case USER -> resolutionService.evictUserCache(assignment.getTargetId());
        }
        return ResponseEntity.noContent().build();
    }

    public record CreateFeatureRequest(@NotBlank String key, @NotBlank String label,
                                        String description, @NotBlank String category, int sortOrder) {}
    public record UpdateFeatureRequest(@NotBlank String label, String description,
                                        @NotBlank String category, int sortOrder, boolean active) {}
    public record CreateAssignmentRequest(@NotBlank String featureKey,
                                           @NotNull AssignmentLevel assignmentLevel,
                                           @NotBlank String targetId, boolean granted) {}
}
