package io.smartpos.payment.api;

import io.smartpos.payment.api.dto.DepositDto;
import io.smartpos.payment.application.DepositService;
import io.smartpos.payment.domain.model.DepositCategory;
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
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/deposits")
@RequiredArgsConstructor
public class DepositController {

    private final DepositService service;

    @GetMapping
    @PreAuthorize("hasAuthority('deposit.manage')")
    public Page<DepositDto> search(@RequestParam(required = false) UUID accountId,
                                   @RequestParam(required = false) UUID categoryId,
                                   @RequestParam(required = false) LocalDate dateFrom,
                                   @RequestParam(required = false) LocalDate dateTo,
                                   Pageable pageable) {
        return service.search(accountId, categoryId, dateFrom, dateTo, pageable);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('deposit.manage')")
    public ResponseEntity<DepositDto> create(@Valid @RequestBody DepositDto.CreateRequest req,
                                             @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.create(req, jwt == null ? null : UUID.fromString(jwt.getSubject())));
    }

    @GetMapping("/categories")
    @PreAuthorize("hasAuthority('deposit.manage')")
    public List<DepositCategory> categories() { return service.listCategories(); }

    @PostMapping("/categories")
    @PreAuthorize("hasAuthority('deposit.manage')")
    public ResponseEntity<DepositCategory> createCategory(@Valid @RequestBody DepositDto.CategoryRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createCategory(req));
    }
}
