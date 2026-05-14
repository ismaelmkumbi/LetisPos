package io.smartpos.product.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.product.api.dto.CustomerGroupDto;
import io.smartpos.product.domain.model.CustomerGroup;
import io.smartpos.product.domain.repository.CustomerGroupRepository;
import io.smartpos.product.domain.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CustomerGroupService {

    private final CustomerGroupRepository repo;
    private final CustomerRepository customerRepo;

    @Transactional(readOnly = true)
    public Page<CustomerGroupDto> list(Pageable pageable) {
        UUID tenantId = TenantContext.get().orElse(null);
        return repo.findAllByTenant(tenantId, pageable)
                .map(g -> CustomerGroupDto.from(g, customerRepo.countByGroupId(g.getId())));
    }

    @Transactional(readOnly = true)
    public List<CustomerGroupDto> listAll() {
        UUID tenantId = TenantContext.get().orElse(null);
        return repo.findAllByTenant(tenantId).stream()
                .map(g -> CustomerGroupDto.from(g, customerRepo.countByGroupId(g.getId())))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public CustomerGroupDto get(UUID id) {
        CustomerGroup g = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer group not found"));
        return CustomerGroupDto.from(g, customerRepo.countByGroupId(g.getId()));
    }

    @Transactional
    public CustomerGroupDto create(CustomerGroupDto.CreateRequest req) {
        CustomerGroup g = CustomerGroup.builder()
                .name(req.name())
                .description(req.description())
                .discountPercent(Optional.ofNullable(req.discountPercent()).orElse(BigDecimal.ZERO))
                .tenantId(TenantContext.require())
                .build();
        g = repo.save(g);
        return CustomerGroupDto.from(g, 0);
    }

    @Transactional
    public CustomerGroupDto update(UUID id, CustomerGroupDto.CreateRequest req) {
        CustomerGroup g = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer group not found"));
        g.setName(req.name());
        g.setDescription(req.description());
        if (req.discountPercent() != null) g.setDiscountPercent(req.discountPercent());
        g = repo.save(g);
        return CustomerGroupDto.from(g, customerRepo.countByGroupId(g.getId()));
    }

    @Transactional
    public void delete(UUID id) {
        if (!repo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer group not found");
        }
        // Detach customers before deleting group
        customerRepo.clearGroupId(id);
        repo.deleteById(id);
    }
}
