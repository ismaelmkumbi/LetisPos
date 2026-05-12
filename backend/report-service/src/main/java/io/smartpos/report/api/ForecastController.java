package io.smartpos.report.api;

import io.smartpos.report.api.dto.ForecastDto;
import io.smartpos.report.api.dto.Period;
import io.smartpos.report.application.ForecastService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ForecastController {

    private final ForecastService forecastService;

    @GetMapping("/forecast")
    @PreAuthorize("hasAuthority('report.sales') or hasAuthority('report.financial')")
    public ForecastDto forecast(@RequestParam(required = false) UUID warehouseId,
                                 @RequestParam(defaultValue = "MONTH") Period period,
                                 @RequestParam(defaultValue = "30") int days) {
        return forecastService.forecast(warehouseId, period, Math.max(1, Math.min(days, 365)));
    }
}
