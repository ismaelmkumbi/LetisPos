package io.smartpos.hrm.api;

import io.smartpos.hrm.api.dto.PayrollDto;
import io.smartpos.hrm.application.PayrollService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/payroll")
@RequiredArgsConstructor
public class PayrollController {

    private final PayrollService service;

    @GetMapping
    @PreAuthorize("hasAuthority('hrm.payroll.view')")
    public List<PayrollDto> list() { return service.list(); }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('hrm.payroll.view')")
    public PayrollDto get(@PathVariable UUID id) { return service.get(id); }

    @PostMapping
    @PreAuthorize("hasAuthority('hrm.payroll.manage')")
    public ResponseEntity<PayrollDto> create(@Valid @RequestBody PayrollDto.CreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAuthority('hrm.payroll.manage')")
    public PayrollDto approve(@PathVariable UUID id) { return service.approve(id); }

    @PostMapping("/{id}/pay")
    @PreAuthorize("hasAuthority('hrm.payroll.manage')")
    public PayrollDto pay(@PathVariable UUID id) { return service.pay(id); }
}
