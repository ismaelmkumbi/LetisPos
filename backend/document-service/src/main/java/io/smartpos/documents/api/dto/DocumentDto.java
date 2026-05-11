package io.smartpos.documents.api.dto;

import io.smartpos.documents.domain.model.Document;
import lombok.Builder;
import lombok.Data;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class DocumentDto {
    private UUID id;
    private UUID tenantId;
    private String documentType;
    private String documentNumber;
    private String referenceType;
    private UUID referenceId;
    private String status;
    private String watermark;
    private Long sizeBytes;
    private String presignedUrl;
    private Instant createdAt;
    private String fiscalCode;
    private String zNumber;
    private String vfdStatus;
    private String buyerTin;
    private String notes;

    public static DocumentDto from(Document doc, String presignedUrl) {
        return DocumentDto.builder()
                .id(doc.getId())
                .tenantId(doc.getTenantId())
                .documentType(doc.getDocumentType())
                .documentNumber(doc.getDocumentNumber())
                .referenceType(doc.getReferenceType())
                .referenceId(doc.getReferenceId())
                .status(doc.getStatus())
                .watermark(doc.getWatermark())
                .sizeBytes(doc.getSizeBytes())
                .presignedUrl(presignedUrl)
                .createdAt(doc.getCreatedAt())
                .fiscalCode(doc.getFiscalCode())
                .zNumber(doc.getZNumber())
                .vfdStatus(doc.getVfdStatus())
                .buyerTin(doc.getBuyerTin())
                .notes(doc.getNotes())
                .build();
    }
}
