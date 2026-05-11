package io.smartpos.report.application;

import io.smartpos.report.api.dto.OperationsReportDto;
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
public class OperationsReportService {

    @Transactional(readOnly = true)
    public OperationsReportDto report(LocalDate date) {
        UUID tenantId = TenantContext.require();
        return new OperationsReportDto(List.of(), List.of(),
            new OperationsReportDto.DailyCloseSummary(date, BigDecimal.ZERO, 0, BigDecimal.ZERO, BigDecimal.ZERO, "OPEN"));
    }
}
