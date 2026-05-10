package io.smartpos.documents.api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class WhatsAppRequest {
    @NotBlank
    private String phone;
    private String message;
}
