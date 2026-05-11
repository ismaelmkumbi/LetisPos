package io.smartpos.report.application;

import io.smartpos.report.api.dto.SupplierReportDto;
import io.smartpos.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SupplierReportService {

    @Transactional(readOnly = true)
    public SupplierReportDto report(LocalDate from, LocalDate to) {
        UUID tenantId = TenantContext.require();
        // TODO: wire to sales-service Feign for supplier spend data
        return new SupplierReportDto(0, BigDecimal.ZERO, List.of(), List.of());
    }
}
