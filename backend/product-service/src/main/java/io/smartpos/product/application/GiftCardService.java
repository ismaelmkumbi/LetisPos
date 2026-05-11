package io.smartpos.product.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.product.api.dto.GiftCardDto;
import io.smartpos.product.domain.model.GiftCard;
import io.smartpos.product.domain.repository.GiftCardRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GiftCardService {

    private final GiftCardRepository repo;
    private static final SecureRandom RNG = new SecureRandom();

    @Transactional(readOnly = true)
    public Page<GiftCardDto> list(Pageable pageable) {
        UUID tenantId = TenantContext.require();
        return repo.findAllByTenant(tenantId, pageable).map(GiftCardDto::from);
    }

    @Transactional(readOnly = true)
    public GiftCardDto get(UUID id) {
        GiftCard g = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Gift card not found"));
        return GiftCardDto.from(g);
    }

    @Transactional
    public GiftCardDto issue(GiftCardDto.IssueRequest req) {
        String cardNumber = generateCardNumber();
        GiftCard g = GiftCard.builder()
                .cardNumber(cardNumber)
                .initialBalance(req.amount())
                .currentBalance(req.amount())
                .expiryDate(req.expiryDate())
                .customerId(req.customerId())
                .status("ACTIVE")
                .tenantId(TenantContext.require())
                .build();
        return GiftCardDto.from(repo.save(g));
    }

    @Transactional
    public GiftCardDto redeem(UUID id, GiftCardDto.RedeemRequest req) {
        GiftCard g = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Gift card not found"));

        if (!"ACTIVE".equals(g.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Gift card is not active (current status: " + g.getStatus() + ")");
        }

        if (g.getExpiryDate() != null && g.getExpiryDate().isBefore(java.time.LocalDate.now())) {
            g.setStatus("EXPIRED");
            repo.save(g);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Gift card has expired");
        }

        if (req.amount().compareTo(g.getCurrentBalance()) > 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Insufficient balance. Available: " + g.getCurrentBalance());
        }

        BigDecimal newBalance = g.getCurrentBalance().subtract(req.amount());
        g.setCurrentBalance(newBalance);

        if (newBalance.compareTo(BigDecimal.ZERO) == 0) {
            g.setStatus("REDEEMED");
        }

        return GiftCardDto.from(repo.save(g));
    }

    private String generateCardNumber() {
        // Format: GC-XXXX-XXXX-XXXX (where X is alphanumeric)
        StringBuilder sb = new StringBuilder("GC-");
        for (int i = 0; i < 12; i++) {
            if (i > 0 && i % 4 == 0) sb.append('-');
            int digit = RNG.nextInt(36); // 0-9A-Z
            if (digit < 10) sb.append(digit);
            else sb.append((char) ('A' + digit - 10));
        }
        return sb.toString();
    }
}
