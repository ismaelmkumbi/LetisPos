package io.smartpos.report.api;
import io.smartpos.report.api.dto.ReportDashboardDto;
import io.smartpos.report.domain.model.ReportDashboard;
import io.smartpos.report.domain.repository.ReportDashboardRepository;
import io.smartpos.common.context.TenantContext;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reports/dashboards")
@RequiredArgsConstructor
public class ReportDashboardController {
    private final ReportDashboardRepository repo;

    @GetMapping
    @PreAuthorize("hasAuthority('report.sales') or hasAuthority('report.financial')")
    public List<ReportDashboardDto> list() {
        return repo.findByTenantIdOrderByUpdatedAtDesc(TenantContext.get().orElse(null))
            .stream().map(ReportDashboardDto::from).toList();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('report.sales') or hasAuthority('report.financial')")
    public ResponseEntity<ReportDashboardDto> create(@Valid @RequestBody ReportDashboardDto.CreateRequest req) {
        ReportDashboard d = ReportDashboard.builder()
            .tenantId(TenantContext.require())
            .name(req.name()).layout(req.layout() != null ? req.layout() : "[]")
            .filters(req.filters() != null ? req.filters() : "{}")
            .shared(req.shared() != null ? req.shared() : false)
            .build();
        return ResponseEntity.status(HttpStatus.CREATED).body(ReportDashboardDto.from(repo.save(d)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('report.sales') or hasAuthority('report.financial')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        if (!repo.existsById(id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        repo.deleteById(id);
    }
}
