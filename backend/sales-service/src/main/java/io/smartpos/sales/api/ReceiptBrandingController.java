package io.smartpos.sales.api;

import io.smartpos.sales.api.dto.ReceiptBrandingDto;
import io.smartpos.sales.application.ReceiptBrandingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/brand/receipt")
@RequiredArgsConstructor
public class ReceiptBrandingController {

    private final ReceiptBrandingService service;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ReceiptBrandingDto> get() {
        return ResponseEntity.ok(service.get());
    }

    @PutMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ReceiptBrandingDto> update(
            @Valid @RequestBody ReceiptBrandingDto.UpdateRequest request) {
        return ResponseEntity.ok(service.update(request));
    }

    @PostMapping("/reset")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ReceiptBrandingDto> reset() {
        return ResponseEntity.ok(service.reset());
    }
}
