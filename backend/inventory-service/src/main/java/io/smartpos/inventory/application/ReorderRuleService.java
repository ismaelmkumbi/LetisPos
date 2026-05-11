package io.smartpos.inventory.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.inventory.api.dto.CreateReorderRuleRequest;
import io.smartpos.inventory.api.dto.ReorderRuleDto;
import io.smartpos.inventory.domain.model.ReorderRule;
import io.smartpos.inventory.domain.model.StockLevel;
import io.smartpos.inventory.domain.repository.ReorderRuleRepository;
import io.smartpos.inventory.domain.repository.StockLevelRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReorderRuleService {

    private final ReorderRuleRepository repo;
    private final StockLevelRepository stockLevelRepo;

    public Page<ReorderRuleDto> list(Pageable pageable) {
        return repo.findAll(pageable).map(ReorderRuleDto::from);
    }

    public ReorderRuleDto get(UUID id) {
        return ReorderRuleDto.from(repo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reorder rule not found")));
    }

    @Transactional
    public ReorderRuleDto create(CreateReorderRuleRequest req) {
        ReorderRule r = ReorderRule.builder()
            .productId(req.productId()).variantId(req.variantId()).warehouseId(req.warehouseId())
            .minQty(req.minQty()).reorderQty(req.reorderQty()).supplierId(req.supplierId())
            .active(req.active() != null ? req.active() : true)
            .build();
        return ReorderRuleDto.from(repo.save(r));
    }

    @Transactional
    public ReorderRuleDto update(UUID id, CreateReorderRuleRequest req) {
        ReorderRule r = repo.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Reorder rule not found"));
        r.setProductId(req.productId()); r.setVariantId(req.variantId()); r.setWarehouseId(req.warehouseId());
        r.setMinQty(req.minQty()); r.setReorderQty(req.reorderQty()); r.setSupplierId(req.supplierId());
        if (req.active() != null) r.setActive(req.active());
        return ReorderRuleDto.from(repo.save(r));
    }

    @Transactional
    public void delete(UUID id) {
        if (!repo.existsById(id)) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Reorder rule not found");
        repo.deleteById(id);
    }

    /** Returns rules whose current available stock ≤ reorder point (min_qty). */
    public List<ReorderRuleDto> triggered(UUID warehouseId) {
        List<ReorderRule> rules = warehouseId != null
            ? repo.findByWarehouseIdAndActiveTrue(warehouseId)
            : repo.findAll().stream().filter(ReorderRule::isActive).toList();
        UUID tenantId = TenantContext.require();
        return rules.stream().filter(r -> {
            var opt = stockLevelRepo.find(r.getProductId(), r.getVariantId(), r.getWarehouseId(), tenantId);
            StockLevel sl = opt.orElse(null);
            return sl == null || sl.available().compareTo(r.getMinQty()) <= 0;
        }).map(ReorderRuleDto::from).toList();
    }
}
