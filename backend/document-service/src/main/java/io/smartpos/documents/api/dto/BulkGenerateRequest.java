package io.smartpos.documents.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;
import java.util.List;
import java.util.UUID;

@Data
public class BulkGenerateRequest {
    @NotBlank
    private String documentType;

    @NotBlank
    private String referenceType;

    @NotEmpty
    private List<UUID> referenceIds;

    private String deliveryChannel; // null, "email", "whatsapp"
    private String deliveryRecipient; // email address or phone number
}
