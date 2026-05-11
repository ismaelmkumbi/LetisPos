package io.smartpos.product.api;

import io.smartpos.product.api.dto.CreatePriceListRequest;
import io.smartpos.product.api.dto.PriceListDto;
import io.smartpos.product.api.dto.PriceListLineDto;
import io.smartpos.product.application.PriceListService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/price-lists")
@RequiredArgsConstructor
public class PriceListController {

    private final PriceListService service;

    @GetMapping
    @PreAuthorize("hasAuthority('product.view')")
    public Page<PriceListDto> list(Pageable pageable) {
        return service.list(pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('product.view')")
    public PriceListDto get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('product.create')")
    public ResponseEntity<PriceListDto> create(@Valid @RequestBody CreatePriceListRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('product.update')")
    public PriceListDto update(@PathVariable UUID id, @Valid @RequestBody CreatePriceListRequest req) {
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('product.delete')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }

    @PutMapping("/{id}/lines")
    @PreAuthorize("hasAuthority('product.update')")
    public List<PriceListLineDto> replaceLines(
            @PathVariable UUID id,
            @Valid @RequestBody List<CreatePriceListRequest.LineInput> inputs) {
        return service.replaceLines(id, inputs);
    }
}
