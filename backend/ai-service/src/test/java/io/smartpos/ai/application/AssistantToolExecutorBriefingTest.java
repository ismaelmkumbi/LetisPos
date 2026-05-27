package io.smartpos.ai.application;

import io.smartpos.ai.api.dto.AssistantDtos;
import io.smartpos.ai.domain.repository.AssistantDraftRepository;
import io.smartpos.ai.infrastructure.feign.*;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AssistantToolExecutorBriefingTest {

    @Test
    void executiveBriefingFallsBackToSalesServiceWhenReportSummaryFails() {
        ReportFeign reportFeign = mock(ReportFeign.class);
        SalesFeign salesFeign = mock(SalesFeign.class);
        InventoryFeign inventoryFeign = mock(InventoryFeign.class);

        when(reportFeign.salesSummary(any(), any(), any(), any()))
            .thenThrow(new RuntimeException("report-service unavailable"));
        when(reportFeign.topProducts(any(), any(), any(), anyInt()))
            .thenThrow(new RuntimeException("top products unavailable"));
        when(reportFeign.topCustomers(any(), any(), anyInt()))
            .thenThrow(new RuntimeException("top customers unavailable"));

        UUID productId = UUID.randomUUID();
        SalesFeign.SaleLineSummary line = new SalesFeign.SaleLineSummary(
            UUID.randomUUID(), productId, null, "Coca-Cola 500ml", "CC500",
            BigDecimal.valueOf(1_500), BigDecimal.valueOf(2),
            BigDecimal.ZERO, null, BigDecimal.ZERO, null,
            BigDecimal.valueOf(3_000), BigDecimal.ZERO, BigDecimal.valueOf(3_000));
        SalesFeign.SaleSummary sale = new SalesFeign.SaleSummary(
            UUID.randomUUID(), "S-001", LocalDate.parse("2026-05-25"),
            null, null, null, "CONFIRMED", "PAID",
            BigDecimal.valueOf(3_000), BigDecimal.ZERO, BigDecimal.ZERO,
            BigDecimal.valueOf(3_000), BigDecimal.valueOf(3_000), "TZS",
            List.of(line), null, null);
        when(salesFeign.search(any(), any(), any(), any(), any(), any(), anyInt(), anyInt()))
            .thenReturn(new SalesFeign.SalePage(List.of(sale), 1, 1, 0, 1000));

        when(inventoryFeign.lowStockAlerts(any(), any()))
            .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));
        when(inventoryFeign.expiringSoon(anyInt()))
            .thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));

        AssistantToolExecutor executor = new AssistantToolExecutor(
            reportFeign, salesFeign, inventoryFeign,
            mock(ProductFeign.class), mock(PaymentFeign.class), mock(CustomerFeign.class),
            mock(AdminFeign.class), mock(NotificationFeign.class), mock(DocumentFeign.class),
            mock(AssistantDraftRepository.class), mock(BrandFeign.class),
            mock(io.smartpos.ai.application.brand.ImageGenerationProvider.class),
            mock(io.smartpos.ai.application.brand.LogoEnhancementProvider.class));

        AssistantDtos.ToolResult result = executor.execute(
            "getExecutiveBriefing", Map.of("date", "2026-05-25"), UUID.randomUUID());

        assertEquals("briefing", result.type());
        assertEquals("partial", result.data().get("dataQuality"));
        assertTrue(String.valueOf(result.data().get("headline")).contains("Sales"));
        assertTrue(String.valueOf(result.data().get("recommendedAction")).contains("Coca-Cola 500ml"));
        assertFalse(((List<?>) result.data().get("warnings")).isEmpty());
    }
}
