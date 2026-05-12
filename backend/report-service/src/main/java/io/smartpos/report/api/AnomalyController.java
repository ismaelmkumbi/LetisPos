package io.smartpos.report.api;

import io.smartpos.report.api.dto.AnomalyDto;
import io.smartpos.report.application.AnomalyService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class AnomalyController {

    private final AnomalyService anomalyService;

    @GetMapping("/anomalies")
    @PreAuthorize("hasAuthority('report.sales') or hasAuthority('report.financial')")
    public List<AnomalyDto> anomalies(@RequestParam(required = false) UUID warehouseId) {
        return anomalyService.anomalies(warehouseId);
    }
}
