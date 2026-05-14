package io.smartpos.report.api;
import io.smartpos.report.api.dto.ScheduledReportDto;
import io.smartpos.report.domain.model.ScheduledReport;
import io.smartpos.report.domain.repository.ScheduledReportRepository;
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
@RequestMapping("/api/v1/reports/schedules")
@RequiredArgsConstructor
public class ScheduledReportController {
    private final ScheduledReportRepository repo;

    @GetMapping
    @PreAuthorize("hasAuthority('report.sales') or hasAuthority('report.financial')")
    public List<ScheduledReportDto> list() {
        return repo.findByTenantIdAndActiveTrue(TenantContext.get().orElse(null))
            .stream().map(ScheduledReportDto::from).toList();
    }

    @PostMapping
    @PreAuthorize("hasAuthority('report.sales') or hasAuthority('report.financial')")
    public ResponseEntity<ScheduledReportDto> create(@Valid @RequestBody ScheduledReportDto.CreateRequest req) {
        ScheduledReport s = ScheduledReport.builder()
            .tenantId(TenantContext.require())
            .reportKey(req.reportKey()).frequency(req.frequency())
            .cronExpression(req.cronExpression()).recipients(req.recipients())
            .format(req.format() != null ? req.format() : "PDF")
            .active(req.active() != null ? req.active() : true)
            .build();
        return ResponseEntity.status(HttpStatus.CREATED).body(ScheduledReportDto.from(repo.save(s)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('report.sales') or hasAuthority('report.financial')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        ScheduledReport s = repo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        s.setActive(false);
        repo.save(s);
    }
}
