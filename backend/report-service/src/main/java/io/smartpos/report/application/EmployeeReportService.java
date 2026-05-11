package io.smartpos.report.application;

import io.smartpos.report.api.dto.EmployeeSalesDto;
import io.smartpos.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EmployeeReportService {

    @Transactional(readOnly = true)
    public EmployeeSalesDto sales(LocalDate from, LocalDate to) {
        UUID tenantId = TenantContext.require();
        // TODO: wire to sales-service for sales by user, join with HRM for names
        return new EmployeeSalesDto(from, to, java.util.List.of());
    }
}
