package io.smartpos.billing.api;

import io.smartpos.billing.domain.model.PlanDefinition;
import io.smartpos.billing.domain.repository.PlanDefinitionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/billing/plans")
@RequiredArgsConstructor
public class PlanController {

    private final PlanDefinitionRepository planRepo;

    @GetMapping
    public ResponseEntity<List<PlanDefinition>> listPublic() {
        return ResponseEntity.ok(planRepo.findByIsPublicTrueOrderBySortOrderAsc());
    }

    @GetMapping("/admin")
    @PreAuthorize("hasAuthority('admin')")
    public ResponseEntity<List<PlanDefinition>> listAll() {
        return ResponseEntity.ok(planRepo.findAll());
    }

    @PutMapping("/admin/{code}")
    @PreAuthorize("hasAuthority('billing.manage')")
    public ResponseEntity<PlanDefinition> update(@PathVariable String code, @RequestBody PlanDefinition update) {
        PlanDefinition plan = planRepo.findByCode(code)
                .orElseThrow(() -> new IllegalArgumentException("Plan not found: " + code));
        plan.setLabel(update.getLabel());
        plan.setDescription(update.getDescription());
        plan.setMonthlyPriceTzs(update.getMonthlyPriceTzs());
        plan.setAnnualPriceTzs(update.getAnnualPriceTzs());
        plan.setFeatures(update.getFeatures());
        return ResponseEntity.ok(planRepo.save(plan));
    }
}
