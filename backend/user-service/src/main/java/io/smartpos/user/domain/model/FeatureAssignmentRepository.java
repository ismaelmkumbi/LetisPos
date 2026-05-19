package io.smartpos.user.domain.model;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.UUID;

public interface FeatureAssignmentRepository extends JpaRepository<FeatureAssignment, UUID> {

    List<FeatureAssignment> findByAssignmentLevelAndTargetId(FeatureAssignment.AssignmentLevel level, String targetId);

    List<FeatureAssignment> findByFeatureKeyAndAssignmentLevel(String featureKey, FeatureAssignment.AssignmentLevel level);

    void deleteByFeatureKeyAndAssignmentLevelAndTargetId(String featureKey, FeatureAssignment.AssignmentLevel level, String targetId);

    @Query(value = """
        SELECT fa.feature_key FROM (
            SELECT fa.*,
                ROW_NUMBER() OVER (
                    PARTITION BY fa.feature_key
                    ORDER BY CASE fa.assignment_level
                        WHEN 'USER' THEN 1
                        WHEN 'TENANT' THEN 2
                        WHEN 'PLAN' THEN 3
                    END
                ) AS priority
            FROM feature_assignments fa
            WHERE (fa.assignment_level = 'PLAN' AND fa.target_id = :planCode)
               OR (fa.assignment_level = 'TENANT' AND fa.target_id = :tenantId)
               OR (fa.assignment_level = 'USER' AND fa.target_id = :userId)
        ) fa
        WHERE fa.priority = 1 AND fa.granted = true
    """, nativeQuery = true)
    List<String> resolveFeatureKeys(@Param("planCode") String planCode,
                                     @Param("tenantId") String tenantId,
                                     @Param("userId") String userId);
}
