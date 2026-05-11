package io.smartpos.product.api;

import io.smartpos.product.api.dto.StoreCreditTransactionDto;
import io.smartpos.product.application.StoreCreditService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/store-credit")
@RequiredArgsConstructor
public class StoreCreditController {

    private final StoreCreditService service;

    @GetMapping
    @PreAuthorize("hasAuthority('customer.manage') or hasAuthority('pos.use')")
    public Page<StoreCreditTransactionDto> listByCustomer(@RequestParam UUID customerId, Pageable pageable) {
        return service.listByCustomer(customerId, pageable);
    }

    @GetMapping("/balance")
    @PreAuthorize("hasAuthority('customer.manage') or hasAuthority('pos.use')")
    public StoreCreditTransactionDto.CustomerBalance getBalance(@RequestParam UUID customerId) {
        BigDecimal balance = service.getCustomerBalance(customerId);
        return new StoreCreditTransactionDto.CustomerBalance(customerId, balance);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('customer.manage')")
    public ResponseEntity<StoreCreditTransactionDto> addCredit(@Valid @RequestBody StoreCreditTransactionDto.AddCreditRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.addCredit(req));
    }

    @PostMapping("/redeem")
    @PreAuthorize("hasAuthority('customer.manage') or hasAuthority('pos.use')")
    public ResponseEntity<StoreCreditTransactionDto> redeem(@Valid @RequestBody StoreCreditTransactionDto.RedeemRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.redeem(req));
    }
}
