package io.smartpos.sales.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.smartpos.sales.api.dto.DraftSaleDto;
import io.smartpos.sales.domain.model.DraftSale;
import io.smartpos.sales.domain.repository.DraftSaleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DraftSaleService {

    private final DraftSaleRepository repo;
    private final ObjectMapper mapper;

    @Transactional(readOnly = true)
    public List<DraftSaleDto> listMine(UUID userId) {
        return repo.findByUserIdOrderByUpdatedAtDesc(userId).stream()
                .map(d -> DraftSaleDto.from(d, parse(d.getData())))
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public DraftSaleDto get(UUID id, UUID userId) {
        DraftSale d = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Draft not found"));
        if (!d.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your draft");
        }
        return DraftSaleDto.from(d, parse(d.getData()));
    }

    @Transactional
    public DraftSaleDto save(DraftSaleDto.SaveRequest req, UUID userId) {
        DraftSale d = DraftSale.builder()
                .userId(userId)
                .warehouseId(req.warehouseId())
                .customerId(req.customerId())
                .label(req.label())
                .data(writeAsJson(req.data()))
                .build();
        DraftSale saved = repo.save(d);
        return DraftSaleDto.from(saved, req.data());
    }

    @Transactional
    public DraftSaleDto update(UUID id, DraftSaleDto.SaveRequest req, UUID userId) {
        DraftSale d = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Draft not found"));
        if (!d.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your draft");
        }
        d.setWarehouseId(req.warehouseId());
        d.setCustomerId(req.customerId());
        d.setLabel(req.label());
        d.setData(writeAsJson(req.data()));
        return DraftSaleDto.from(repo.save(d), req.data());
    }

    @Transactional
    public void delete(UUID id, UUID userId) {
        DraftSale d = repo.findById(id).orElse(null);
        if (d == null) return;
        if (!d.getUserId().equals(userId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Not your draft");
        }
        repo.delete(d);
    }

    // ---- helpers ----
    private String writeAsJson(Object o) {
        try { return mapper.writeValueAsString(o); }
        catch (JsonProcessingException e) { throw new IllegalStateException(e); }
    }

    private Object parse(String json) {
        try { return json == null ? null : mapper.readValue(json, Object.class); }
        catch (JsonProcessingException e) { return json; }
    }
}
