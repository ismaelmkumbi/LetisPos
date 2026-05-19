package io.smartpos.user.application;

import io.smartpos.user.domain.model.FeatureAssignment;
import io.smartpos.user.domain.model.FeatureAssignment.AssignmentLevel;
import io.smartpos.user.domain.model.FeatureAssignmentRepository;
import io.smartpos.user.domain.model.FeatureDefinition;
import io.smartpos.user.domain.model.FeatureDefinitionRepository;
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

    private final FeatureAssignmentRepository assignmentRepository;
    private final FeatureDefinitionRepository featureDefinitionRepository;

    @Cacheable(value = "features:plan", key = "#planCode")
    public Set<String> getPlanFeatures(String planCode) {
        return toFeatureKeySet(assignmentRepository
            .findByAssignmentLevelAndTargetId(AssignmentLevel.PLAN, planCode));
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
        Set<String> features = new HashSet<>(getPlanFeatures(planCode));

        // Apply tenant overrides (add or remove)
        for (FeatureAssignment a : assignmentRepository
                .findByAssignmentLevelAndTargetId(AssignmentLevel.TENANT, tenantId)) {
            if (a.isGranted()) {
                features.add(a.getFeatureKey());
            } else {
                features.remove(a.getFeatureKey());
            }
        }

        // Apply user overrides (highest priority)
        for (FeatureAssignment a : assignmentRepository
                .findByAssignmentLevelAndTargetId(AssignmentLevel.USER, userId)) {
            if (a.isGranted()) {
                features.add(a.getFeatureKey());
            } else {
                features.remove(a.getFeatureKey());
            }
        }

        return features;
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
        for (FeatureAssignment a : assignments) {
            if (a.isGranted()) {
                keys.add(a.getFeatureKey());
            }
        }
        return keys;
    }
}
