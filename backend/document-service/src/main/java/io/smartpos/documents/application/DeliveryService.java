package io.smartpos.documents.application;

import io.smartpos.documents.domain.model.Document;
import io.smartpos.documents.domain.repository.DocumentRepository;
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

    public void sendEmail(Document doc, String to, String subject, String message) throws Exception {
        String pdfUrl = documentService.getPresignedUrl(doc);
        String displayType = Arrays.stream(doc.getDocumentType().split("-"))
            .map(w -> w.substring(0, 1).toUpperCase() + w.substring(1))
            .collect(Collectors.joining(" "));

        String htmlBody = """
            <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">
                <div style="background:#2563eb;color:#fff;padding:20px;text-align:center;border-radius:8px 8px 0 0;">
                    <h2 style="margin:0;">Letis POS</h2>
                    <p style="margin:4px 0 0;font-size:14px;opacity:0.9;">%s • #%s</p>
                </div>
                <div style="padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px;">
                    <p style="font-size:14px;color:#333;">%s</p>
                    <div style="text-align:center;margin:24px 0;">
                        <a href="%s" style="background:#2563eb;color:#fff;padding:12px 32px;text-decoration:none;border-radius:6px;font-size:14px;font-weight:600;">Download PDF</a>
                    </div>
                    <p style="font-size:12px;color:#888;text-align:center;">This link expires in 1 hour.</p>
                    <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
                    <p style="font-size:11px;color:#aaa;text-align:center;">Letis POS • Tanzania • info@letispos.com</p>
                </div>
            </div>
            """.formatted(displayType, doc.getDocumentNumber(),
                message != null && !message.isEmpty() ? message : "Please find your " + displayType.toLowerCase() + " attached.",
                pdfUrl);

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
}
