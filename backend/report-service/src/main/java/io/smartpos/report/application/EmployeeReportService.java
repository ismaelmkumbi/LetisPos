package io.smartpos.report.application;

import io.smartpos.report.api.dto.EmployeeSalesDto;
import io.smartpos.report.infrastructure.feign.SalesFeign;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmployeeReportService {

    private final SalesFeign salesFeign;

    @Transactional(readOnly = true)
    public EmployeeSalesDto sales(LocalDate from, LocalDate to) {
        try {
            var result = salesFeign.salesByUser(from, to);
            if (result != null && !result.isEmpty()) {
                var rows = result.stream().map(r -> new EmployeeSalesDto.EmployeeRow(
                    r.userId(),
                    r.userName() != null && !r.userName().isEmpty()
                        ? r.userName()
                        : "User " + r.userId().toString().substring(0, 8),
                    r.saleCount(), r.totalNet(), r.totalGross(), r.itemsSold()
                )).toList();
                return new EmployeeSalesDto(from, to, rows);
            }
        } catch (Exception e) {
            log.warn("Failed to fetch employee sales: {}", e.getMessage());
        }
        return new EmployeeSalesDto(from, to, List.of());
    }
}
