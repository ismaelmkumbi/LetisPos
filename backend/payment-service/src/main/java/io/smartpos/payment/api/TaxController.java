package io.smartpos.payment.api;

import io.smartpos.common.context.TenantContext;
import io.smartpos.payment.api.dto.TaxRateInput;
import io.smartpos.payment.api.dto.TaxSummaryDto;
import io.smartpos.payment.domain.model.TaxRate;
import io.smartpos.payment.domain.repository.TaxRateRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/taxes")
@RequiredArgsConstructor
public class TaxController {

    private final TaxRateRepository taxRepo;

    @GetMapping
    @PreAuthorize("hasAuthority('tax.view') or hasAuthority('admin')")
    public List<TaxRate> list() {
        return taxRepo.findByTenantIdOrderByNameAsc(TenantContext.require());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('tax.create') or hasAuthority('admin')")
    public TaxRate create(@Valid @RequestBody TaxRateInput input) {
        TaxRate tax = TaxRate.builder()
                .tenantId(TenantContext.require())
                .name(input.name())
                .rate(input.rate())
                .type(input.type())
                .description(input.description())
                .active(input.active() != null ? input.active() : true)
                .build();
        return taxRepo.save(tax);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('tax.update') or hasAuthority('admin')")
    public TaxRate update(@PathVariable UUID id, @Valid @RequestBody TaxRateInput input) {
        TaxRate tax = taxRepo.findById(id).orElseThrow(() ->
                new IllegalArgumentException("Tax rate not found: " + id));

        if (input.name() != null) tax.setName(input.name());
        if (input.rate() != null) tax.setRate(input.rate());
        if (input.type() != null) tax.setType(input.type());
        if (input.description() != null) tax.setDescription(input.description());
        if (input.active() != null) tax.setActive(input.active());

        return taxRepo.save(tax);
    }

    @PatchMapping("/{id}/toggle-active")
    @PreAuthorize("hasAuthority('tax.update') or hasAuthority('admin')")
    public TaxRate toggleActive(@PathVariable UUID id) {
        TaxRate tax = taxRepo.findById(id).orElseThrow(() ->
                new IllegalArgumentException("Tax rate not found: " + id));
        tax.setActive(!tax.isActive());
        return taxRepo.save(tax);
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAuthority('tax.view') or hasAuthority('admin')")
    public TaxSummaryDto summary() {
        UUID tenantId = TenantContext.require();
        List<TaxRate> activeRates = taxRepo.findByTenantIdAndActiveTrueOrderByNameAsc(tenantId);

        List<TaxSummaryDto.Breakdown> breakdown = activeRates.stream()
                .map(rate -> new TaxSummaryDto.Breakdown(
                        rate.getId(),
                        rate.getName(),
                        rate.getRate(),
                        BigDecimal.ZERO // TODO: compute collected amounts from payment/sales data
                ))
                .toList();

        return new TaxSummaryDto(
                BigDecimal.ZERO, // thisMonth — requires sales/payment integration
                BigDecimal.ZERO, // thisQuarter
                BigDecimal.ZERO, // thisYear
                breakdown
        );
    }
}
