package io.smartpos.product.api;

import io.smartpos.product.api.dto.CustomerGroupDto;
import io.smartpos.product.application.CustomerGroupService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/customer-groups")
@RequiredArgsConstructor
public class CustomerGroupController {

    private final CustomerGroupService service;

    @GetMapping
    @PreAuthorize("hasAuthority('customer.manage') or hasAuthority('pos.use')")
    public Page<CustomerGroupDto> list(Pageable pageable) {
        return service.list(pageable);
    }

    @GetMapping("/all")
    @PreAuthorize("hasAuthority('customer.manage') or hasAuthority('pos.use')")
    public List<CustomerGroupDto> listAll() {
        return service.listAll();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('customer.manage') or hasAuthority('pos.use')")
    public CustomerGroupDto get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('customer.manage')")
    public ResponseEntity<CustomerGroupDto> create(@Valid @RequestBody CustomerGroupDto.CreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('customer.manage')")
    public CustomerGroupDto update(@PathVariable UUID id, @Valid @RequestBody CustomerGroupDto.CreateRequest req) {
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('customer.manage')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }
}
