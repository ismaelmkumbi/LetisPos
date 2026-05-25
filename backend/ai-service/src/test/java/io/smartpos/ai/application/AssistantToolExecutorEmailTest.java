package io.smartpos.ai.application;

import io.smartpos.ai.api.dto.AssistantDtos;
import io.smartpos.ai.domain.repository.AssistantDraftRepository;
import io.smartpos.ai.infrastructure.feign.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AssistantToolExecutorEmailTest {

    private AssistantToolExecutor executor;
    private NotificationFeign notificationFeign;
    private DocumentFeign documentFeign;
    private SalesFeign salesFeign;

    @BeforeEach
    void setUp() {
        notificationFeign = mock(NotificationFeign.class);
        documentFeign = mock(DocumentFeign.class);
        // Other dependencies mocked but unused in these tests
        var reportFeign = mock(ReportFeign.class);
        salesFeign = mock(SalesFeign.class);
        var inventoryFeign = mock(InventoryFeign.class);
        var productFeign = mock(ProductFeign.class);
        var paymentFeign = mock(PaymentFeign.class);
        var customerFeign = mock(CustomerFeign.class);
        var adminFeign = mock(AdminFeign.class);
        var draftRepo = mock(AssistantDraftRepository.class);
        var brandFeign = mock(io.smartpos.ai.infrastructure.feign.BrandFeign.class);
        var imageGen = mock(io.smartpos.ai.application.brand.ImageGenerationProvider.class);
        var logoEnh = mock(io.smartpos.ai.application.brand.LogoEnhancementProvider.class);

        executor = new AssistantToolExecutor(
            reportFeign, salesFeign, inventoryFeign, productFeign,
            paymentFeign, customerFeign, adminFeign, notificationFeign,
            documentFeign, draftRepo, brandFeign, imageGen, logoEnh);
    }

    @Test
    void sendEmail_withSubjectAndBody() {
        when(notificationFeign.send(any())).thenReturn(Map.of("id", "del-123"));

        var args = Map.of(
            "recipient", "customer@example.com",
            "subject", (Object) "Your Invoice #INV-001",
            "body", (Object) "Thank you for your purchase."
        );

        AssistantDtos.ToolResult result = executor.execute("sendEmail", args, UUID.randomUUID());

        assertEquals("text", result.type());
        assertEquals("Email Sent", result.title());
        assertEquals("sent", result.data().get("status"));
        assertEquals("customer@example.com", result.data().get("recipient"));
        assertEquals("del-123", result.data().get("deliveryId"));

        verify(notificationFeign).send(argThat(body -> {
            return "EMAIL".equals(body.get("channel"))
                && "customer@example.com".equals(body.get("recipient"))
                && "Your Invoice #INV-001".equals(body.get("subject"))
                && "Thank you for your purchase.".equals(body.get("body"));
        }));
    }

    @Test
    void sendEmail_withTemplate() {
        when(notificationFeign.send(any())).thenReturn(Map.of("id", "del-456"));

        var args = Map.of(
            "recipient", "customer@example.com",
            "subject", (Object) "Welcome to LetisPOS",
            "templateCode", (Object) "welcome_email"
        );

        AssistantDtos.ToolResult result = executor.execute("sendEmail", args, UUID.randomUUID());

        assertEquals("sent", result.data().get("status"));
        verify(notificationFeign).send(argThat(body ->
            "welcome_email".equals(body.get("templateCode"))
        ));
    }

    @Test
    void sendSMS() {
        when(notificationFeign.send(any())).thenReturn(Map.of("id", "sms-789"));

        var args = Map.of(
            "recipient", "+255712345678",
            "body", (Object) "Your order is ready for pickup."
        );

        AssistantDtos.ToolResult result = executor.execute("sendSMS", args, UUID.randomUUID());

        assertEquals("sent", result.data().get("status"));
        assertEquals("+255712345678", result.data().get("recipient"));

        verify(notificationFeign).send(argThat(body ->
            "SMS".equals(body.get("channel"))
        ));
    }

    @Test
    void emailDocument() {
        UUID docId = UUID.randomUUID();
        when(documentFeign.searchByRef(eq(docId.toString()), any(), any(), anyInt(), anyInt()))
            .thenReturn(Map.of("content", List.of(Map.of("id", docId.toString()))));
        when(documentFeign.emailDocument(any(), any()))
            .thenReturn(Map.of("status", "queued"));
        var args = Map.of(
            "documentId", (Object) docId.toString(),
            "to", (Object) "customer@example.com",
            "subject", (Object) "Your Invoice",
            "message", (Object) "Please find attached."
        );

        AssistantDtos.ToolResult result = executor.execute("emailDocument", args, UUID.randomUUID());

        assertEquals("Document Emailed", result.title());
        assertEquals("queued", result.data().get("status"));
        assertEquals(docId.toString(), result.data().get("documentId"));

        verify(documentFeign).emailDocument(eq(docId), argThat(body ->
            "customer@example.com".equals(body.get("to"))
        ));
    }

    @Test
    void emailDocument_withoutOptionalMessage() {
        UUID docId = UUID.randomUUID();
        when(documentFeign.searchByRef(eq(docId.toString()), any(), any(), anyInt(), anyInt()))
            .thenReturn(Map.of("content", List.of(Map.of("id", docId.toString()))));
        when(documentFeign.emailDocument(any(), any()))
            .thenReturn(Map.of("status", "queued"));
        var args = Map.of(
            "documentId", (Object) docId.toString(),
            "to", (Object) "customer@example.com"
        );

        AssistantDtos.ToolResult result = executor.execute("emailDocument", args, UUID.randomUUID());

        assertEquals("queued", result.data().get("status"));
        // Should not fail when message is missing
    }

    @Test
    void emailDocument_rejectsAmbiguousReportReference() {
        when(documentFeign.searchByRef(eq("monthly-report"), any(), any(), anyInt(), anyInt()))
            .thenReturn(Map.of("content", List.of()));

        var args = Map.of(
            "documentId", (Object) "monthly-report",
            "to", (Object) "customer@example.com"
        );

        ToolException ex = assertThrows(ToolException.class,
            () -> executor.execute("emailDocument", args, UUID.randomUUID()));

        assertEquals("INVALID_ARG", ex.code());
        assertTrue(ex.getMessage().contains("monthly-report"));
        verifyNoInteractions(salesFeign);
    }

    @Test
    void emailDocument_requiresRecipient() {
        var args = Map.of("documentId", (Object) UUID.randomUUID().toString());

        ToolException ex = assertThrows(ToolException.class,
            () -> executor.execute("emailDocument", args, UUID.randomUUID()));

        assertEquals("INVALID_ARG", ex.code());
        assertTrue(ex.hint().contains("email address"));
    }

    @Test
    void emailDocument_timeoutClassifiesAsUpstream() {
        UUID docId = UUID.randomUUID();
        when(documentFeign.searchByRef(eq(docId.toString()), any(), any(), anyInt(), anyInt()))
            .thenReturn(Map.of("content", List.of(Map.of("id", docId.toString()))));
        when(documentFeign.emailDocument(any(), any()))
            .thenThrow(new RuntimeException("Read timed out executing POST http://10.0.0.2:8089/api/v1/notifications"));

        var args = Map.of(
            "documentId", (Object) docId.toString(),
            "to", (Object) "customer@example.com"
        );

        ToolException ex = ToolException.classify("emailDocument",
            assertThrows(RuntimeException.class,
                () -> executor.execute("emailDocument", args, UUID.randomUUID())));

        assertEquals("UPSTREAM", ex.code());
    }

    @Test
    void getNotificationTemplates() {
        when(notificationFeign.listTemplates(null, "EMAIL"))
            .thenReturn(List.of(
                Map.of("code", "welcome_email", "name", "Welcome Email", "channel", "EMAIL", "subject", "Welcome!"),
                Map.of("code", "receipt", "name", "Receipt Email", "channel", "EMAIL", "subject", "Your Receipt")
            ));

        Map<String, Object> args = Map.<String, Object>of("channel", "EMAIL");
        AssistantDtos.ToolResult result = executor.execute("getNotificationTemplates", args, UUID.randomUUID());

        assertEquals("table", result.type());
        assertTrue(result.title().contains("EMAIL"));
        @SuppressWarnings("unchecked")
        var rows = (List<List<Object>>) result.data().get("rows");
        assertEquals(2, rows.size());
    }

    @Test
    void unknownWriteTool_throwsException() {
        assertThrows(IllegalArgumentException.class, () ->
            executor.execute("nonexistentTool", Map.of(), UUID.randomUUID()));
    }
}
