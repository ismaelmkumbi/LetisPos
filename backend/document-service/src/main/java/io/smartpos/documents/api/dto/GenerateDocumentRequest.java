package io.smartpos.documents.api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import java.util.Map;
import java.util.UUID;

@Data
public class GenerateDocumentRequest {
    @NotBlank
    private String documentType;
    private String referenceType;
    private UUID referenceId;
    private Map<String, Object> contextData;
    private String locale = "en";
}
