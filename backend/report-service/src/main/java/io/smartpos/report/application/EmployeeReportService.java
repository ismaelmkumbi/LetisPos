package io.smartpos.report.application;

import io.smartpos.report.api.dto.EmployeeSalesDto;
import io.smartpos.report.infrastructure.feign.SalesFeign;
import io.smartpos.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmployeeReportService {

    private final SalesFeign salesFeign;

    @Transactional(readOnly = true)
    public EmployeeSalesDto sales(LocalDate from, LocalDate to) {
        UUID tenantId = TenantContext.require();

        // TODO: Add salesByUser(tenantId, from, to) endpoint to sales-service and
        //       add the corresponding method to SalesFeign. Once available, map
        //       results into EmployeeSalesDto.EmployeeRow instances here.
        //       Also join with HRM service for employee names.
        log.debug("Employee sales requested for tenant={}, period={}/{} — "
                + "sales-by-user endpoint not yet available in sales-service",
                tenantId, from, to);

        return new EmployeeSalesDto(from, to, List.of());
    }
}
