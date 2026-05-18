package io.smartpos.documents.application;

import com.github.jknack.handlebars.Handlebars;
import io.smartpos.documents.domain.model.Document;
import io.smartpos.documents.domain.repository.DocumentRepository;
import io.smartpos.documents.infrastructure.config.HandlebarsConfig;
import io.smartpos.documents.infrastructure.feign.NotificationClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeliveryService {

    private final NotificationClient notificationClient;
    private final DocumentService documentService;
    private final DocumentRepository documentRepo;

    public void sendEmail(Document doc, String to, String subject, String message,
                           Map<String, Object> companyContext) throws Exception {
        String pdfUrl = documentService.getPresignedUrl(doc);
        String displayType = Arrays.stream(doc.getDocumentType().split("-"))
            .map(w -> w.substring(0, 1).toUpperCase() + w.substring(1))
            .collect(Collectors.joining(" "));

        String htmlBody = renderEmailWrapper(companyContext, displayType,
                doc.getDocumentNumber(), message, pdfUrl);

        Map<String, Object> request = Map.of(
            "channel", "EMAIL",
            "recipient", to,
            "subject", subject,
            "body", htmlBody,
            "html", true
        );
        notificationClient.send(request);
        log.info("Sent document {} via email to {}", doc.getDocumentNumber(), to);

        if ("draft".equals(doc.getStatus())) {
            doc.setStatus("sent");
            documentRepo.save(doc);
            documentService.createVersion(doc, "sent_email", "Sent via email to " + to);
        }
    }

    /** Convenience overload for callers without company context. */
    public void sendEmail(Document doc, String to, String subject, String message) throws Exception {
        sendEmail(doc, to, subject, message, defaultCompanyContext());
    }

    public void sendWhatsApp(Document doc, String phone, String message) throws Exception {
        String pdfUrl = documentService.getPresignedUrl(doc);
        String displayType = Arrays.stream(doc.getDocumentType().split("-"))
            .map(w -> w.substring(0, 1).toUpperCase() + w.substring(1))
            .collect(Collectors.joining(" "));

        String body = "*Letis POS* - " + displayType + " #" + doc.getDocumentNumber() + "\n\n"
            + (message != null && !message.isEmpty() ? message + "\n\n" : "")
            + "Download: " + pdfUrl;

        Map<String, Object> request = Map.of(
            "channel", "WHATSAPP",
            "recipient", phone,
            "body", body
        );
        notificationClient.send(request);
        log.info("Sent document {} via WhatsApp to {}", doc.getDocumentNumber(), phone);

        if ("draft".equals(doc.getStatus())) {
            doc.setStatus("sent");
            documentRepo.save(doc);
            documentService.createVersion(doc, "sent_whatsapp", "Sent via WhatsApp to " + phone);
        }
    }

    private String renderEmailWrapper(Map<String, Object> ctx, String displayType,
                                       String docNumber, String message, String downloadUrl) {
        try {
            ctx.put("displayType", displayType);
            ctx.put("documentNumber", docNumber);
            ctx.put("message", message != null && !message.isEmpty()
                    ? message : "Please find your " + displayType.toLowerCase() + " attached.");
            ctx.put("downloadUrl", downloadUrl);
            Handlebars hbs = HandlebarsConfig.createStandalone();
            return hbs.compileInline(
                    new String(getClass().getClassLoader()
                            .getResourceAsStream("templates/email-wrapper.hbs")
                            .readAllBytes()))
                    .apply(ctx);
        } catch (Exception e) {
            log.warn("Failed to render branded email, falling back to basic: {}", e.getMessage());
            return basicEmailFallback(displayType, docNumber, message, downloadUrl);
        }
    }

    private String basicEmailFallback(String displayType, String docNumber,
                                       String message, String downloadUrl) {
        return String.format("""
            <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">
                <div style="background:#16A34A;color:#fff;padding:24px;text-align:center;border-radius:8px 8px 0 0;">
                    <h2 style="margin:0;">Letis POS</h2><p style="margin:4px 0 0;font-size:14px;">%s • #%s</p>
                </div>
                <div style="padding:24px;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 8px 8px;">
                    <p style="font-size:14px;color:#334155;">%s</p>
                    <div style="text-align:center;margin:24px 0;">
                        <a href="%s" style="background:#16A34A;color:#fff;padding:14px 36px;text-decoration:none;border-radius:8px;font-weight:700;display:inline-block;">Download PDF</a>
                    </div>
                </div>
            </div>
            """, displayType, docNumber, message, downloadUrl);
    }

    private static Map<String, Object> defaultCompanyContext() {
        return Map.of(
            "name", "Letis POS",
            "primaryColor", "#16A34A",
            "primaryColorDark", "#15803D",
            "fontFamily", "'Helvetica Neue', Arial, sans-serif",
            "address", "", "email", "", "footerMessage", ""
        );
    }
}
