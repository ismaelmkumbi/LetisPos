package io.smartpos.inventory.api;

import io.smartpos.inventory.api.dto.StockCountDto;
import io.smartpos.inventory.application.StockCountService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/stock-counts")
@RequiredArgsConstructor
public class StockCountController {

    private final StockCountService service;

    @GetMapping
    @PreAuthorize("hasAuthority('stock.count') or hasAuthority('stock.view')")
    public Page<StockCountDto.ListItem> list(@RequestParam(required = false) String search,
                                              Pageable pageable) {
        return service.list(search, pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('stock.count') or hasAuthority('stock.view')")
    public StockCountDto get(@PathVariable UUID id) { return service.get(id); }

    @PostMapping
    @PreAuthorize("hasAuthority('stock.count')")
    public ResponseEntity<StockCountDto> open(@Valid @RequestBody StockCountDto.CreateRequest req,
                                              @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.open(req, jwt == null ? null : UUID.fromString(jwt.getSubject())));
    }

    @PostMapping("/{id}/lines")
    @PreAuthorize("hasAuthority('stock.count')")
    public StockCountDto submitLines(@PathVariable UUID id,
                                     @Valid @RequestBody StockCountDto.SubmitLinesRequest req) {
        return service.submitLines(id, req);
    }

    @PostMapping("/{id}/post")
    @PreAuthorize("hasAuthority('stock.count')")
    public StockCountDto post(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) {
        return service.post(id, jwt == null ? null : UUID.fromString(jwt.getSubject()));
    }
}
