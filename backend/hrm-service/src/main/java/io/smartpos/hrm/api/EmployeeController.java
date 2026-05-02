package io.smartpos.hrm.api;

import io.smartpos.hrm.api.dto.EmployeeDto;
import io.smartpos.hrm.application.EmployeeService;
import io.smartpos.hrm.domain.model.EmployeeStatus;
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
@RequestMapping("/api/v1/employees")
@RequiredArgsConstructor
public class EmployeeController {

    private final EmployeeService service;

    @GetMapping
    @PreAuthorize("hasAuthority('hrm.view')")
    public Page<EmployeeDto> search(@RequestParam(required = false) String search,
                                    @RequestParam(required = false) UUID departmentId,
                                    @RequestParam(required = false) UUID designationId,
                                    @RequestParam(required = false) EmployeeStatus status,
                                    Pageable pageable) {
        return service.search(search, departmentId, designationId, status, pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('hrm.view')")
    public EmployeeDto get(@PathVariable UUID id) { return service.get(id); }

    @PostMapping
    @PreAuthorize("hasAuthority('hrm.manage')")
    public ResponseEntity<EmployeeDto> create(@Valid @RequestBody EmployeeDto.CreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('hrm.manage')")
    public EmployeeDto update(@PathVariable UUID id, @RequestBody EmployeeDto.UpdateRequest req) {
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('hrm.manage')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) { service.delete(id); }
}
