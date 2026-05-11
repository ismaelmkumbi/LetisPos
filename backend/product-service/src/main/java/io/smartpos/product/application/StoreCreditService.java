package io.smartpos.product.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.product.api.dto.StoreCreditTransactionDto;
import io.smartpos.product.domain.model.StoreCreditTransaction;
import io.smartpos.product.domain.repository.StoreCreditTransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StoreCreditService {

    private final StoreCreditTransactionRepository repo;

    @Transactional(readOnly = true)
    public Page<StoreCreditTransactionDto> listByCustomer(UUID customerId, Pageable pageable) {
        return repo.findByCustomerId(customerId, pageable)
                .map(StoreCreditTransactionDto::from);
    }

    @Transactional(readOnly = true)
    public BigDecimal getCustomerBalance(UUID customerId) {
        return repo.getBalance(customerId);
    }

    @Transactional
    public StoreCreditTransactionDto addCredit(StoreCreditTransactionDto.AddCreditRequest req) {
        StoreCreditTransaction t = StoreCreditTransaction.builder()
                .customerId(req.customerId())
                .amount(req.amount())
                .type("DEPOSIT")
                .reference(req.reference())
                .notes(req.notes())
                .tenantId(TenantContext.require())
                .build();
        return StoreCreditTransactionDto.from(repo.save(t));
    }

    @Transactional
    public StoreCreditTransactionDto redeem(StoreCreditTransactionDto.RedeemRequest req) {
        BigDecimal balance = repo.getBalance(req.customerId());
        if (balance.compareTo(req.amount()) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Insufficient store credit. Available: " + balance + ", requested: " + req.amount());
        }

        StoreCreditTransaction t = StoreCreditTransaction.builder()
                .customerId(req.customerId())
                .amount(req.amount().negate())
                .type("REDEMPTION")
                .reference(req.posReference())
                .tenantId(TenantContext.require())
                .build();
        return StoreCreditTransactionDto.from(repo.save(t));
    }
}
