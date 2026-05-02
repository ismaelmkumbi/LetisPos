package io.smartpos.inventory.api;

import io.smartpos.inventory.api.dto.TransferDto;
import io.smartpos.inventory.application.TransferService;
import io.smartpos.inventory.domain.model.TransferStatus;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/transfers")
@RequiredArgsConstructor
public class TransferController {

    private final TransferService service;

    @GetMapping
    @PreAuthorize("hasAuthority('stock.transfer') or hasAuthority('stock.view')")
    public Page<TransferDto> search(@RequestParam(required = false) TransferStatus status,
                                    @RequestParam(required = false) LocalDate dateFrom,
                                    @RequestParam(required = false) LocalDate dateTo,
                                    Pageable pageable) {
        return service.search(status, dateFrom, dateTo, pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('stock.transfer') or hasAuthority('stock.view')")
    public TransferDto get(@PathVariable UUID id) { return service.get(id); }

    @PostMapping
    @PreAuthorize("hasAuthority('stock.transfer')")
    public ResponseEntity<TransferDto> create(@Valid @RequestBody TransferDto.CreateRequest req,
                                              @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.create(req, jwt == null ? null : UUID.fromString(jwt.getSubject())));
    }

    @PostMapping("/{id}/complete")
    @PreAuthorize("hasAuthority('stock.transfer')")
    public TransferDto complete(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        return service.complete(id, jwt == null ? null : UUID.fromString(jwt.getSubject()));
    }
}
