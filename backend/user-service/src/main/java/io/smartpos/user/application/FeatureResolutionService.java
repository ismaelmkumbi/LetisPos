package io.smartpos.user.application;

import io.smartpos.user.domain.model.FeatureAssignment;
import io.smartpos.user.domain.model.FeatureAssignment.AssignmentLevel;
import io.smartpos.user.domain.model.FeatureAssignmentRepository;
import io.smartpos.user.domain.model.FeatureDefinition;
import io.smartpos.user.domain.model.FeatureDefinitionRepository;
import io.smartpos.user.domain.model.UserProfile;
import io.smartpos.user.domain.repository.UserProfileRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class FeatureResolutionService {

    private static final List<String> PLAN_ORDER = List.of("STARTER", "BUSINESS", "PROFESSIONAL", "ENTERPRISE");

    private final FeatureAssignmentRepository assignmentRepository;
    private final FeatureDefinitionRepository featureDefinitionRepository;
    private final UserProfileRepository userProfileRepository;

    @Cacheable(value = "features:plan", key = "#planCode")
    public Set<String> getPlanFeatures(String planCode) {
        Set<String> keys = new HashSet<>();
        for (String plan : includedPlans(planCode)) {
            applyAssignments(keys, assignmentRepository.findByAssignmentLevelAndTargetId(AssignmentLevel.PLAN, plan));
        }
        return keys;
    }

    @Cacheable(value = "features:tenant", key = "#tenantId")
    public Set<String> getTenantOverrides(String tenantId) {
        return toFeatureKeySet(assignmentRepository
            .findByAssignmentLevelAndTargetId(AssignmentLevel.TENANT, tenantId));
    }

    @Cacheable(value = "features:user", key = "#userId")
    public Set<String> getUserOverrides(String userId) {
        return toFeatureKeySet(assignmentRepository
            .findByAssignmentLevelAndTargetId(AssignmentLevel.USER, userId));
    }

    public Set<String> resolveFeatures(String planCode, String tenantId, String userId) {
        // SUPER_ADMIN is platform-level — gets every feature regardless of plan
        if (userId != null && isSuperAdmin(userId)) {
            Set<String> all = new HashSet<>();
            for (FeatureDefinition fd : featureDefinitionRepository.findByActiveTrueOrderBySortOrderAsc()) {
                all.add(fd.getKey());
            }
            return all;
        }

        Set<String> features = new HashSet<>(getPlanFeatures(planCode));

        // Apply tenant overrides (add or remove)
        applyAssignments(features, assignmentRepository.findByAssignmentLevelAndTargetId(AssignmentLevel.TENANT, tenantId));

        // Apply user overrides (highest priority)
        applyAssignments(features, assignmentRepository.findByAssignmentLevelAndTargetId(AssignmentLevel.USER, userId));

        return features;
    }

    private boolean isSuperAdmin(String userId) {
        try {
            UUID id = UUID.fromString(userId);
            return userProfileRepository.findById(id)
                    .map(u -> u.getRoles().stream().anyMatch(r -> "SUPER_ADMIN".equals(r.getName())))
                    .orElse(false);
        } catch (IllegalArgumentException e) {
            return false;
        }
    }

    @CacheEvict(value = "features:plan", key = "#planCode")
    public void evictPlanCache(String planCode) {}

    @CacheEvict(value = "features:tenant", key = "#tenantId")
    public void evictTenantCache(String tenantId) {}

    @CacheEvict(value = "features:user", key = "#userId")
    public void evictUserCache(String userId) {}

    public List<FeatureDefinition> getActiveFeatures() {
        return featureDefinitionRepository.findByActiveTrueOrderBySortOrderAsc();
    }

    @Transactional
    public FeatureAssignment assignFeature(String featureKey, AssignmentLevel level,
                                            String targetId, boolean granted, UUID createdBy) {
        // Remove any existing assignment for this exact combination
        assignmentRepository.deleteByFeatureKeyAndAssignmentLevelAndTargetId(featureKey, level, targetId);

        FeatureAssignment assignment = FeatureAssignment.builder()
            .featureKey(featureKey)
            .assignmentLevel(level)
            .targetId(targetId)
            .granted(granted)
            .createdBy(createdBy)
            .build();
        return assignmentRepository.save(assignment);
    }

    @Transactional
    public void removeAssignment(String featureKey, AssignmentLevel level, String targetId) {
        assignmentRepository.deleteByFeatureKeyAndAssignmentLevelAndTargetId(featureKey, level, targetId);
    }

    public List<FeatureAssignment> getAssignmentsByLevelAndTarget(AssignmentLevel level, String targetId) {
        return assignmentRepository.findByAssignmentLevelAndTargetId(level, targetId);
    }

    public List<FeatureAssignment> getAllAssignments() {
        return assignmentRepository.findAll();
    }

    public FeatureAssignment getAssignmentById(UUID id) {
        return assignmentRepository.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Assignment not found: " + id));
    }

    private Set<String> toFeatureKeySet(List<FeatureAssignment> assignments) {
        Set<String> keys = new HashSet<>();
        applyAssignments(keys, assignments);
        return keys;
    }

    private List<String> includedPlans(String planCode) {
        int index = PLAN_ORDER.indexOf(planCode);
        if (index < 0) {
            return List.of(planCode);
        }
        return PLAN_ORDER.subList(0, index + 1);
    }

    private void applyAssignments(Set<String> keys, List<FeatureAssignment> assignments) {
        for (FeatureAssignment a : assignments) {
            if (a.isGranted()) {
                keys.add(a.getFeatureKey());
            } else {
                keys.remove(a.getFeatureKey());
            }
        }
    }
}
