package io.smartpos.report.api;

import io.smartpos.report.api.dto.Period;
import io.smartpos.report.api.dto.TopPerformerDto;
import io.smartpos.report.application.TopPerformersService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class TopPerformersController {

    private final TopPerformersService topPerformersService;

    @GetMapping("/top-products")
    @PreAuthorize("hasAuthority('report.sales') or hasAuthority('report.financial')")
    public List<TopPerformerDto> topProducts(@RequestParam(required = false) UUID warehouseId,
                                              @RequestParam(defaultValue = "MONTH") Period period,
                                              @RequestParam(defaultValue = "5") int limit) {
        return topPerformersService.topProducts(warehouseId, period, Math.max(1, Math.min(limit, 50)));
    }

    @GetMapping("/top-customers")
    @PreAuthorize("hasAuthority('report.sales') or hasAuthority('report.financial')")
    public List<TopPerformerDto> topCustomers(@RequestParam(required = false) UUID warehouseId,
                                               @RequestParam(defaultValue = "MONTH") Period period,
                                               @RequestParam(defaultValue = "5") int limit) {
        return topPerformersService.topCustomers(warehouseId, period, Math.max(1, Math.min(limit, 50)));
    }

    @GetMapping("/top-suppliers")
    @PreAuthorize("hasAuthority('report.sales') or hasAuthority('report.financial')")
    public List<TopPerformerDto> topSuppliers(@RequestParam(required = false) UUID warehouseId,
                                               @RequestParam(defaultValue = "MONTH") Period period,
                                               @RequestParam(defaultValue = "5") int limit) {
        return topPerformersService.topSuppliers(warehouseId, period, Math.max(1, Math.min(limit, 50)));
    }
}
