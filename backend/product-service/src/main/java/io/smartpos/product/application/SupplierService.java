package io.smartpos.product.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.product.api.dto.SupplierDto;
import io.smartpos.product.domain.model.Supplier;
import io.smartpos.product.domain.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SupplierService {

    private final SupplierRepository repo;

    @Transactional(readOnly = true)
    public Page<SupplierDto> search(String q, Boolean active, Pageable pageable) {
        return repo.search(q, active, TenantContext.require(), pageable).map(SupplierDto::from);
    }

    @Transactional(readOnly = true)
    public SupplierDto get(UUID id) {
        return repo.findById(id).map(SupplierDto::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Supplier not found"));
    }

    @Transactional
    public SupplierDto create(SupplierDto.CreateRequest req) {
        Supplier s = Supplier.builder()
                .code(req.code())
                .name(req.name())
                .email(req.email())
                .phone(req.phone())
                .taxNumber(req.taxNumber())
                .address(req.address())
                .city(req.city())
                .country(req.country())
                .tenantId(TenantContext.require())
                .notes(req.notes())
                .active(true)
                .build();
        return SupplierDto.from(repo.save(s));
    }

    @Transactional
    public SupplierDto update(UUID id, SupplierDto.CreateRequest req) {
        Supplier s = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Supplier not found"));
        s.setCode(req.code());
        s.setName(req.name());
        s.setEmail(req.email());
        s.setPhone(req.phone());
        s.setTaxNumber(req.taxNumber());
        s.setAddress(req.address());
        s.setCity(req.city());
        s.setCountry(req.country());
        s.setNotes(req.notes());
        return SupplierDto.from(repo.save(s));
    }

    @Transactional
    public void delete(UUID id) {
        Supplier s = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Supplier not found"));
        s.softDelete();
        repo.save(s);
    }

    @Transactional
    public SupplierDto toggleActive(UUID id) {
        Supplier s = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Supplier not found"));
        s.setActive(!s.isActive());
        return SupplierDto.from(repo.save(s));
    }
}
