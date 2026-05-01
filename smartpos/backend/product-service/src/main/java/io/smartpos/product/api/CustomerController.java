package io.smartpos.product.api;

import io.smartpos.product.api.dto.CustomerDto;
import io.smartpos.product.application.CustomerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService service;

    @GetMapping
    @PreAuthorize("hasAuthority('customer.manage') or hasAuthority('pos.use')")
    public Page<CustomerDto> list(@RequestParam(required = false) String search,
                                  @RequestParam(required = false) Boolean active,
                                  Pageable pageable) {
        return service.search(search, active, pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('customer.manage') or hasAuthority('pos.use')")
    public CustomerDto get(@PathVariable UUID id) { return service.get(id); }

    @PostMapping
    @PreAuthorize("hasAuthority('customer.manage')")
    public ResponseEntity<CustomerDto> create(@Valid @RequestBody CustomerDto.CreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('customer.manage')")
    public CustomerDto update(@PathVariable UUID id, @Valid @RequestBody CustomerDto.CreateRequest req) {
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('customer.manage')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) { service.delete(id); }
}
