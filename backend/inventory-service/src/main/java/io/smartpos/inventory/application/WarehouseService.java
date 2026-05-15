package io.smartpos.inventory.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.inventory.api.dto.WarehouseDto;
import io.smartpos.inventory.domain.model.Warehouse;
import io.smartpos.inventory.domain.repository.WarehouseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class WarehouseService {

    private final WarehouseRepository repo;

    @Transactional(readOnly = true)
    public List<WarehouseDto> list() {
        return TenantContext.get()
                .map(repo::findByTenantId)
                .orElseGet(repo::findAll)
                .stream()
                .map(WarehouseDto::from).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public WarehouseDto get(UUID id) {
        Warehouse w = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Warehouse not found"));
        UUID tenantId = TenantContext.get().orElse(null);
        if (tenantId != null && !tenantId.equals(w.getTenantId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Warehouse not found");
        }
        return WarehouseDto.from(w);
    }

    @Transactional
    public WarehouseDto create(WarehouseDto.CreateRequest req) {
        // Enforce plan maxStores limit
        UUID tenantId = TenantContext.require();
        int maxStores = getMaxStoresFromJwt();
        long warehouseCount = repo.countByTenantIdAndActiveTrue(tenantId);
        if (warehouseCount >= maxStores) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Store limit reached. Your plan allows " + maxStores
                    + " stores. Upgrade to add more.");
        }

        if (req.code() != null && repo.findByTenantIdAndCodeIgnoreCase(tenantId, req.code()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Warehouse code already exists");
        }
        Warehouse w = Warehouse.builder()
                .code(req.code()).name(req.name())
                .city(req.city()).country(req.country())
                .phone(req.phone()).email(req.email())
                .zip(req.zip()).notes(req.notes())
                .branchId(req.branchId())
                .active(true)
                .tenantId(tenantId)
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

    /**
     * Reads the tenantMaxStores claim from the current JWT.
     * Falls back to 1 (most restrictive) if not available, ensuring safe
     * defaults when claims are missing.
     */
    private int getMaxStoresFromJwt() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
                Integer maxStores = jwt.getClaim("tenantMaxStores");
                if (maxStores != null && maxStores > 0) {
                    return maxStores;
                }
            }
        } catch (Exception e) {
            log.debug("Could not read tenantMaxStores from JWT: {}", e.getMessage());
        }
        return 1;
    }
}
