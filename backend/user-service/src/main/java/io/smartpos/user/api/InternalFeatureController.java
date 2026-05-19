package io.smartpos.user.api;

import io.smartpos.user.application.FeatureResolutionService;
import io.smartpos.user.domain.model.PathFeatureMapping;
import io.smartpos.user.domain.model.PathFeatureMappingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Set;

@RestController
@RequestMapping("/api/internal/features")
@RequiredArgsConstructor
public class InternalFeatureController {

    private final FeatureResolutionService resolutionService;
    private final PathFeatureMappingRepository pathMappingRepository;

    @GetMapping("/resolved")
    public ResponseEntity<Set<String>> resolveFeatures(
            @RequestParam String tenantId,
            @RequestParam String userId,
            @RequestParam String planCode) {
        Set<String> features = resolutionService.resolveFeatures(planCode, tenantId, userId);
        return ResponseEntity.ok(features);
    }

    @GetMapping("/path-mappings")
    public ResponseEntity<List<PathFeatureMapping>> getPathMappings() {
        return ResponseEntity.ok(pathMappingRepository.findAllByOrderBySortOrderAsc());
    }
}
