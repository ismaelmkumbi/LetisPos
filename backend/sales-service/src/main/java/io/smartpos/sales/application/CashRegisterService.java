package io.smartpos.sales.application;

import io.smartpos.sales.api.dto.CashRegisterSessionDto;
import io.smartpos.sales.domain.model.CashRegisterSession;
import io.smartpos.sales.domain.model.CashRegisterStatus;
import io.smartpos.sales.domain.model.Sale;
import io.smartpos.sales.domain.model.SaleStatus;
import io.smartpos.sales.domain.repository.CashRegisterSessionRepository;
import io.smartpos.sales.domain.repository.SaleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class CashRegisterService {

    private final CashRegisterSessionRepository sessionRepo;
    private final SaleRepository saleRepo;

    public CashRegisterSessionDto open(UUID warehouseId, UUID userId, BigDecimal openingBalance) {
        sessionRepo.findTopByWarehouseIdAndStatusOrderByOpenedAtDesc(warehouseId, CashRegisterStatus.OPEN)
            .ifPresent(s -> {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A register is already open for this warehouse since " + s.getOpenedAt());
            });

        CashRegisterSession session = CashRegisterSession.builder()
            .warehouseId(warehouseId)
            .userId(userId)
            .openingBalance(openingBalance != null ? openingBalance : BigDecimal.ZERO)
            .status(CashRegisterStatus.OPEN)
            .build();

        session = sessionRepo.save(session);
        log.info("Cash register opened: warehouse={} user={} openingBalance={}", warehouseId, userId, session.getOpeningBalance());
        return CashRegisterSessionDto.from(session);
    }

    @Transactional(readOnly = true)
    public CashRegisterSessionDto getCurrent(UUID warehouseId) {
        CashRegisterSession session = sessionRepo
            .findTopByWarehouseIdAndStatusOrderByOpenedAtDesc(warehouseId, CashRegisterStatus.OPEN)
            .orElse(null);

        if (session == null) return null;

        BigDecimal expected = computeExpectedCash(warehouseId, session.getOpenedAt(), Instant.now());
        session.setExpectedCash(expected);
        return CashRegisterSessionDto.from(session);
    }

    public CashRegisterSessionDto close(UUID warehouseId, UUID userId, BigDecimal countedCash, String notes) {
        CashRegisterSession session = sessionRepo
            .findTopByWarehouseIdAndStatusOrderByOpenedAtDesc(warehouseId, CashRegisterStatus.OPEN)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                "No open register found for this warehouse"));

        BigDecimal expected = computeExpectedCash(warehouseId, session.getOpenedAt(), Instant.now());
        session.close(countedCash, notes, expected);
        sessionRepo.save(session);

        log.info("Cash register closed: warehouse={} user={} counted={} expected={} difference={}",
            warehouseId, userId, countedCash, expected,
            countedCash.subtract(expected));
        return CashRegisterSessionDto.from(session);
    }

    @Transactional(readOnly = true)
    public List<CashRegisterSessionDto> history(UUID warehouseId) {
        return sessionRepo.findByWarehouseId(warehouseId).stream()
            .map(CashRegisterSessionDto::from)
            .toList();
    }

    private BigDecimal computeExpectedCash(UUID warehouseId, Instant from, Instant to) {
        List<Sale> sales = saleRepo.findByWarehouseIdAndStatusAndConfirmedAtBetween(
            warehouseId, SaleStatus.CONFIRMED, from, to,
            PageRequest.of(0, 500, Sort.by("confirmedAt").ascending()));
        return sales.stream()
            .filter(Sale::isPos)
            .map(Sale::getGrandTotal)
            .reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
