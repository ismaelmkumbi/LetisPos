package io.smartpos.documents.application;

import io.smartpos.documents.domain.model.Document;
import io.smartpos.documents.domain.repository.DocumentRepository;
import io.smartpos.documents.infrastructure.feign.NotificationClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class DeliveryService {

    private final NotificationClient notificationClient;
    private final DocumentService documentService;
    private final DocumentRepository documentRepo;

    public void sendEmail(Document doc, String to, String subject, String message) throws Exception {
        String pdfUrl = documentService.getPresignedUrl(doc);
        Map<String, Object> request = Map.of(
            "channel", "EMAIL",
            "to", to,
            "subject", subject,
            "body", message + "\n\nDownload: " + pdfUrl
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
        Map<String, Object> request = Map.of(
            "channel", "WHATSAPP",
            "to", phone,
            "body", message + "\n" + pdfUrl
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
