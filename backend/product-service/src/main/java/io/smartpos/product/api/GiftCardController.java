package io.smartpos.product.api;

import io.smartpos.product.api.dto.GiftCardDto;
import io.smartpos.product.application.GiftCardService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/gift-cards")
@RequiredArgsConstructor
public class GiftCardController {

    private final GiftCardService service;

    @GetMapping
    @PreAuthorize("hasAuthority('customer.manage') or hasAuthority('pos.use')")
    public Page<GiftCardDto> list(Pageable pageable) {
        return service.list(pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('customer.manage') or hasAuthority('pos.use')")
    public GiftCardDto get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('customer.manage')")
    public ResponseEntity<GiftCardDto> issue(@Valid @RequestBody GiftCardDto.IssueRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.issue(req));
    }

    @PostMapping("/{id}/redeem")
    @PreAuthorize("hasAuthority('customer.manage') or hasAuthority('pos.use')")
    public GiftCardDto redeem(@PathVariable UUID id, @Valid @RequestBody GiftCardDto.RedeemRequest req) {
        return service.redeem(id, req);
    }
}
