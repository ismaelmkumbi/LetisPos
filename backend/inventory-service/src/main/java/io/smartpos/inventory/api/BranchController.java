package io.smartpos.inventory.api;

import io.smartpos.inventory.domain.model.Branch;
import io.smartpos.inventory.domain.repository.BranchRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/branches")
@RequiredArgsConstructor
public class BranchController {

    private final BranchRepository branchRepo;

    @GetMapping
    public ResponseEntity<List<Branch>> list(@RequestHeader("X-Tenant-ID") UUID tenantId) {
        return ResponseEntity.ok(branchRepo.findByTenantIdOrderByNameAsc(tenantId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Branch> get(@PathVariable UUID id) {
        return branchRepo.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('branch.manage')")
    public ResponseEntity<Branch> create(
            @RequestHeader("X-Tenant-ID") UUID tenantId,
            @RequestBody @Valid CreateBranchRequest request) {
        if (branchRepo.existsByTenantIdAndCodeIgnoreCase(tenantId, request.code())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A branch with this code already exists");
        }
        Branch branch = Branch.builder()
                .name(request.name())
                .code(request.code())
                .address(request.address())
                .city(request.city())
                .phone(request.phone())
                .active(true)
                .tenantId(tenantId)
                .build();
        return ResponseEntity.status(HttpStatus.CREATED).body(branchRepo.save(branch));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('branch.manage')")
    public ResponseEntity<Branch> update(@PathVariable UUID id, @RequestBody @Valid UpdateBranchRequest request) {
        Branch branch = branchRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Branch not found"));
        if (request.name() != null) branch.setName(request.name());
        if (request.code() != null) branch.setCode(request.code());
        if (request.address() != null) branch.setAddress(request.address());
        if (request.city() != null) branch.setCity(request.city());
        if (request.phone() != null) branch.setPhone(request.phone());
        return ResponseEntity.ok(branchRepo.save(branch));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('branch.manage')")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        Branch branch = branchRepo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Branch not found"));
        branch.setActive(false);
        branchRepo.save(branch);
        return ResponseEntity.noContent().build();
    }

    public record CreateBranchRequest(
            @NotBlank String name, @NotBlank String code,
            String address, String city, String phone) {}

    public record UpdateBranchRequest(
            String name, String code, String address, String city, String phone) {}
}
