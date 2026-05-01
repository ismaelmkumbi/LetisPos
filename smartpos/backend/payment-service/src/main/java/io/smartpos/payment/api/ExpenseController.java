package io.smartpos.payment.api;

import io.smartpos.payment.api.dto.ExpenseDto;
import io.smartpos.payment.application.ExpenseService;
import io.smartpos.payment.domain.model.ExpenseCategory;
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
@RequestMapping("/api/v1/expenses")
@RequiredArgsConstructor
public class ExpenseController {

    private final ExpenseService service;

    @GetMapping
    @PreAuthorize("hasAuthority('expense.manage')")
    public Page<ExpenseDto> search(@RequestParam(required = false) UUID accountId,
                                   @RequestParam(required = false) UUID categoryId,
                                   @RequestParam(required = false) LocalDate dateFrom,
                                   @RequestParam(required = false) LocalDate dateTo,
                                   Pageable pageable) {
        return service.search(accountId, categoryId, dateFrom, dateTo, pageable);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('expense.manage')")
    public ResponseEntity<ExpenseDto> create(@Valid @RequestBody ExpenseDto.CreateRequest req,
                                             @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.create(req, jwt == null ? null : UUID.fromString(jwt.getSubject())));
    }

    @GetMapping("/categories")
    @PreAuthorize("hasAuthority('expense.manage')")
    public List<ExpenseCategory> categories() { return service.listCategories(); }

    @PostMapping("/categories")
    @PreAuthorize("hasAuthority('expense.manage')")
    public ResponseEntity<ExpenseCategory> createCategory(@Valid @RequestBody ExpenseDto.CategoryRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.createCategory(req));
    }
}
