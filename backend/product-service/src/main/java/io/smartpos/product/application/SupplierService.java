package io.smartpos.product.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.product.api.dto.SupplierBalanceDto;
import io.smartpos.product.api.dto.SupplierDto;
import io.smartpos.product.domain.model.Supplier;
import io.smartpos.product.domain.repository.SupplierRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SupplierService {

    private final SupplierRepository repo;
    private final RestTemplate restTemplate;

    @Value("${smartpos.sales-service.url:http://localhost:8085}")
    private String salesServiceUrl;

    @Transactional(readOnly = true)
    public Page<SupplierDto> search(String q, Boolean active, Pageable pageable) {
        return repo.search(q, active, TenantContext.get().orElse(null), pageable).map(SupplierDto::from);
    }

    @Transactional(readOnly = true)
    public SupplierDto get(UUID id) {
        return repo.findById(id).map(SupplierDto::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Supplier not found"));
    }

    /**
     * Returns the supplier's outstanding balance by querying the sales-service
     * for purchase totals and subtracting paid amounts.
     */
    @Transactional(readOnly = true)
    public SupplierBalanceDto getBalance(UUID id) {
        Supplier supplier = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Supplier not found"));

        BigDecimal totalPurchases = BigDecimal.ZERO;
        BigDecimal totalPaid = BigDecimal.ZERO;

        try {
            // Fetch purchase stats from sales-service filtered by supplier
            var statsUrl = salesServiceUrl + "/api/v1/purchases/stats?supplierId=" + id;
            var stats = restTemplate.getForObject(statsUrl, PurchaseStatsResponse.class);
            if (stats != null) {
                totalPurchases = stats.gross() != null ? stats.gross() : BigDecimal.ZERO;
                totalPaid = stats.paid() != null ? stats.paid() : BigDecimal.ZERO;
            }
        } catch (Exception e) {
            log.warn("Failed to fetch purchase stats for supplier {}: {}", id, e.getMessage());
        }

        BigDecimal balance = totalPurchases.subtract(totalPaid);

        return new SupplierBalanceDto(
                supplier.getId(),
                supplier.getName(),
                totalPurchases,
                totalPaid,
                balance
        );
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

    /** Response shape from GET /api/v1/purchases/stats */
    private record PurchaseStatsResponse(BigDecimal gross, BigDecimal paid, BigDecimal due, Long count) {}
}
