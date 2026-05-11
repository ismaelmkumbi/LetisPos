package io.smartpos.inventory.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.inventory.api.dto.WarehouseDto;
import io.smartpos.inventory.domain.model.Warehouse;
import io.smartpos.inventory.domain.repository.WarehouseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class WarehouseService {

    private final WarehouseRepository repo;

    @Transactional(readOnly = true)
    public List<WarehouseDto> list() {
        return repo.findByTenantId(TenantContext.require()).stream()
                .map(WarehouseDto::from).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public WarehouseDto get(UUID id) {
        return repo.findById(id).map(WarehouseDto::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Warehouse not found"));
    }

    @Transactional
    public WarehouseDto create(WarehouseDto.CreateRequest req) {
        if (req.code() != null && repo.findByCodeIgnoreCase(req.code()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Warehouse code already exists");
        }
        Warehouse w = Warehouse.builder()
                .code(req.code()).name(req.name())
                .city(req.city()).country(req.country())
                .phone(req.phone()).email(req.email())
                .zip(req.zip()).notes(req.notes())
                .branchId(req.branchId())
                .active(true)
                .tenantId(TenantContext.require())
                .build();
        return WarehouseDto.from(repo.save(w));
    }

    @Transactional
    public WarehouseDto update(UUID id, WarehouseDto.CreateRequest req) {
        Warehouse w = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Warehouse not found"));
        w.setCode(req.code());
        w.setName(req.name());
        w.setCity(req.city());
        w.setCountry(req.country());
        w.setPhone(req.phone());
        w.setEmail(req.email());
        w.setZip(req.zip());
        w.setNotes(req.notes());
        if (req.branchId() != null) w.setBranchId(req.branchId());
        return WarehouseDto.from(repo.save(w));
    }

    @Transactional
    public void deactivate(UUID id) {
        Warehouse w = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Warehouse not found"));
        w.setActive(false);
        repo.save(w);
    }

    @Transactional
    public WarehouseDto setStatus(UUID id, boolean active) {
        Warehouse w = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Warehouse not found"));
        w.setActive(active);
        return WarehouseDto.from(repo.save(w));
    }
}
