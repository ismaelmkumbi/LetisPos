package io.smartpos.product.application;

import io.smartpos.product.api.dto.CreatePriceListRequest;
import io.smartpos.product.api.dto.PriceListDto;
import io.smartpos.product.api.dto.PriceListLineDto;
import io.smartpos.product.domain.model.PriceList;
import io.smartpos.product.domain.model.PriceListLine;
import io.smartpos.product.domain.repository.PriceListLineRepository;
import io.smartpos.product.domain.repository.PriceListRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class PriceListService {

    private final PriceListRepository priceListRepository;
    private final PriceListLineRepository priceListLineRepository;

    public Page<PriceListDto> list(Pageable pageable) {
        return priceListRepository.findAll(pageable)
                .map(PriceListDto::headerOnly);
    }

    public PriceListDto get(UUID id) {
        PriceList pl = priceListRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Price list not found"));
        List<PriceListLineDto> lines = priceListLineRepository
                .findByPriceListIdOrderByProductIdAscMinQtyAsc(id)
                .stream().map(PriceListLineDto::from).toList();
        return PriceListDto.from(pl, lines);
    }

    @Transactional
    public PriceListDto create(CreatePriceListRequest req) {
        PriceList pl = PriceList.builder()
                .name(req.name())
                .description(req.description())
                .customerGroup(req.customerGroup())
                .currency(req.currency() != null ? req.currency() : "TZS")
                .active(req.active() != null ? req.active() : true)
                .startDate(req.startDate())
                .endDate(req.endDate())
                .build();
        pl = priceListRepository.save(pl);
        if (req.lines() != null && !req.lines().isEmpty()) {
            replaceLines(pl.getId(), req.lines());
        }
        return get(pl.getId());
    }

    @Transactional
    public PriceListDto update(UUID id, CreatePriceListRequest req) {
        PriceList pl = priceListRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Price list not found"));
        pl.setName(req.name());
        pl.setDescription(req.description());
        pl.setCustomerGroup(req.customerGroup());
        if (req.currency() != null) pl.setCurrency(req.currency());
        if (req.active() != null) pl.setActive(req.active());
        pl.setStartDate(req.startDate());
        pl.setEndDate(req.endDate());
        priceListRepository.save(pl);
        if (req.lines() != null) {
            replaceLines(id, req.lines());
        }
        return get(id);
    }

    @Transactional
    public void delete(UUID id) {
        PriceList pl = priceListRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Price list not found"));
        priceListRepository.delete(pl);
    }

    @Transactional
    public List<PriceListLineDto> replaceLines(UUID priceListId, List<CreatePriceListRequest.LineInput> inputs) {
        priceListLineRepository.deleteByPriceListId(priceListId);
        List<PriceListLine> lines = new ArrayList<>();
        for (var input : inputs) {
            lines.add(PriceListLine.builder()
                    .priceListId(priceListId)
                    .productId(input.productId())
                    .variantId(input.variantId())
                    .price(input.price())
                    .minQty(input.minQty() != null ? input.minQty() : BigDecimal.ONE)
                    .maxQty(input.maxQty())
                    .build());
        }
        lines = priceListLineRepository.saveAll(lines);
        return lines.stream().map(PriceListLineDto::from).toList();
    }
}
