package io.smartpos.product.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.product.api.dto.CustomerDto;
import io.smartpos.product.domain.model.Customer;
import io.smartpos.product.domain.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository repo;

    @Transactional(readOnly = true)
    public Page<CustomerDto> search(String q, Boolean active, Pageable pageable) {
        return repo.search(q, active, TenantContext.get().orElse(null), pageable).map(CustomerDto::from);
    }

    @Transactional(readOnly = true)
    public CustomerDto get(UUID id) {
        return repo.findById(id).map(CustomerDto::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found"));
    }

    @Transactional
    public CustomerDto create(CustomerDto.CreateRequest req) {
        Customer c = Customer.builder()
                .code(req.code())
                .name(req.name())
                .email(req.email())
                .phone(req.phone())
                .taxNumber(req.taxNumber())
                .address(req.address())
                .city(req.city())
                .country(req.country())
                .creditLimit(Optional.ofNullable(req.creditLimit()).orElse(BigDecimal.ZERO))
                .notes(req.notes())
                .groupId(req.groupId())
                .tenantId(TenantContext.require())
                .active(true)
                .build();
        return CustomerDto.from(repo.save(c));
    }

    @Transactional
    public CustomerDto update(UUID id, CustomerDto.CreateRequest req) {
        Customer c = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found"));
        c.setCode(req.code());
        c.setName(req.name());
        c.setEmail(req.email());
        c.setPhone(req.phone());
        c.setTaxNumber(req.taxNumber());
        c.setAddress(req.address());
        c.setCity(req.city());
        c.setCountry(req.country());
        if (req.creditLimit() != null) c.setCreditLimit(req.creditLimit());
        c.setNotes(req.notes());
        c.setGroupId(req.groupId());
        return CustomerDto.from(repo.save(c));
    }

    @Transactional
    public void delete(UUID id) {
        Customer c = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Customer not found"));
        c.softDelete();
        repo.save(c);
    }
}
