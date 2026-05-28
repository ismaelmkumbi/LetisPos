package io.smartpos.sales.api;

import io.smartpos.sales.api.dto.EmailBrandingDto;
import io.smartpos.sales.application.EmailBrandingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/brand/email")
@RequiredArgsConstructor
public class EmailBrandingController {

    private final EmailBrandingService service;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<EmailBrandingDto> get() {
        return ResponseEntity.ok(service.get());
    }

    @PutMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<EmailBrandingDto> update(
            @Valid @RequestBody EmailBrandingDto.UpdateRequest request) {
        return ResponseEntity.ok(service.update(request));
    }

    @PostMapping("/reset")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<EmailBrandingDto> reset() {
        return ResponseEntity.ok(service.reset());
    }
}
