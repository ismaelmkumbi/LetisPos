package io.smartpos.sales.application;

import io.smartpos.sales.api.dto.OfflineSyncDto;
import io.smartpos.sales.api.dto.SaleDto;
import io.smartpos.sales.domain.model.OfflineOpId;
import io.smartpos.sales.domain.repository.OfflineOpIdRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Processes a batch of offline-captured sales. The whole batch handler is
 * NOT a single transaction — each item runs in its own tx so a failure on
 * one row doesn't roll back successful neighbours. Per-row idempotency
 * lives in {@code offline_op_ids}: a duplicate clientOpId returns the
 * previously assigned saleId.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class OfflineSyncService {

    private final SaleService saleService;
    private final OfflineOpIdRepository opIds;

    public OfflineSyncDto.BatchResult sync(OfflineSyncDto.BatchUpload batch, UUID userId) {
        List<OfflineSyncDto.ItemResult> results = new ArrayList<>(batch.items().size());
        int success = 0, failed = 0;

        for (OfflineSyncDto.Item item : batch.items()) {
            try {
                results.add(processOne(batch.terminalId(), item, userId));
                success++;
            } catch (Exception e) {
                log.warn("Offline op {} failed: {}", item.clientOpId(), e.getMessage());
                results.add(new OfflineSyncDto.ItemResult(item.clientOpId(), null, "FAILED", e.getMessage()));
                recordFailure(batch.terminalId(), item.clientOpId(), e.getMessage());
                failed++;
            }
        }
        return new OfflineSyncDto.BatchResult(UUID.randomUUID(), batch.items().size(),
                success, failed, results);
    }

    /**
     * Each item in its own tx. If we've seen this clientOpId before, return
     * the cached sale id (could be OK or FAILED — either way we don't retry
     * the side-effectful Sale creation).
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public OfflineSyncDto.ItemResult processOne(UUID terminalId, OfflineSyncDto.Item item, UUID userId) {
        Optional<OfflineOpId> existing = opIds.findByTerminalIdAndClientOpId(terminalId, item.clientOpId());
        if (existing.isPresent()) {
            OfflineOpId e = existing.get();
            return new OfflineSyncDto.ItemResult(item.clientOpId(), e.getSaleId(), e.getStatus(), e.getError());
        }
        SaleDto sale = saleService.create(item.sale(), userId, true);
        opIds.save(OfflineOpId.builder()
                .terminalId(terminalId)
                .clientOpId(item.clientOpId())
                .saleId(sale.id())
                .status("OK")
                .build());
        return new OfflineSyncDto.ItemResult(item.clientOpId(), sale.id(), "OK", null);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordFailure(UUID terminalId, String clientOpId, String error) {
        // Don't fail the whole batch handler if even logging blows up.
        try {
            opIds.save(OfflineOpId.builder()
                    .terminalId(terminalId)
                    .clientOpId(clientOpId)
                    .status("FAILED")
                    .error(error)
                    .build());
        } catch (Exception ignored) { /* unique-constraint = already recorded */ }
    }
}
