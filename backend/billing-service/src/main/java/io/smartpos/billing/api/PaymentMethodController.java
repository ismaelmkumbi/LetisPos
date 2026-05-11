package io.smartpos.billing.api;

import io.smartpos.billing.domain.model.PaymentMethod;
import io.smartpos.billing.domain.repository.PaymentMethodRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/billing/payment-methods")
@RequiredArgsConstructor
public class PaymentMethodController {

    private final PaymentMethodRepository paymentMethodRepo;

    @GetMapping("/tenant/{tenantId}")
    @PreAuthorize("hasAuthority('billing.view') or @tenantOwnershipCheck.isCurrentTenant(#tenantId)")
    public ResponseEntity<List<PaymentMethod>> listByTenant(@PathVariable UUID tenantId) {
        return ResponseEntity.ok(paymentMethodRepo.findByTenantIdOrderByCreatedAtDesc(tenantId));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('billing.manage') or @tenantOwnershipCheck.isCurrentTenant(#tenantId)")
    public ResponseEntity<PaymentMethod> create(
            @RequestBody @Valid CreatePaymentMethodRequest request) {
        PaymentMethod pm = PaymentMethod.builder()
            .tenantId(request.tenantId())
            .type(request.type())
            .provider(request.provider())
            .label(request.label())
            .providerCustomerId(request.providerCustomerId())
            .isDefault(request.isDefault() != null && request.isDefault())
            .build();
        // Unset existing default if this one is default
        if (pm.isDefault()) {
            paymentMethodRepo.findByTenantIdAndIsDefaultTrue(pm.getTenantId())
                .ifPresent(existing -> {
                    existing.setDefault(false);
                    paymentMethodRepo.save(existing);
                });
        }
        return ResponseEntity.status(201).body(paymentMethodRepo.save(pm));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('billing.manage') or @tenantOwnershipCheck.isCurrentTenant(#tenantId)")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        paymentMethodRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    public record CreatePaymentMethodRequest(
        @NotNull UUID tenantId,
        @NotBlank String type,
        String provider,
        @NotBlank String label,
        String providerCustomerId,
        Boolean isDefault
    ) {}
}
