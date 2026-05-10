package io.smartpos.documents.api.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class EmailRequest {
    @NotBlank
    private String to;
    @NotBlank
    private String subject;
    private String message;
}
