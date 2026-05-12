package io.smartpos.sales.api;

import io.smartpos.sales.api.dto.CouponDto;
import io.smartpos.sales.api.dto.CreateCouponRequest;
import io.smartpos.sales.api.dto.GenerateCouponCodesRequest;
import io.smartpos.sales.application.CouponService;
import io.smartpos.sales.application.CouponService.ValidateCouponResponse;
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
@RequestMapping("/api/v1/coupons")
@RequiredArgsConstructor
public class CouponController {

    private final CouponService service;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public Page<CouponDto> list(Pageable pageable,
                                 @RequestParam(required = false) Boolean active) {
        return service.list(pageable, active);
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public CouponDto get(@PathVariable UUID id) {
        return service.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('coupon.manage')")
    public ResponseEntity<CouponDto> create(@Valid @RequestBody CreateCouponRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @PostMapping("/{id}/generate-codes")
    @PreAuthorize("hasAuthority('coupon.manage')")
    public ResponseEntity<List<CouponDto>> generateCodes(@PathVariable UUID id,
                                                          @Valid @RequestBody GenerateCouponCodesRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.generateCodes(id, req));
    }

    @GetMapping("/validate/{code}")
    public ResponseEntity<ValidateCouponResponse> validate(@PathVariable String code) {
        return ResponseEntity.ok(service.validate(code));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('coupon.manage')")
    public CouponDto update(@PathVariable UUID id, @Valid @RequestBody CreateCouponRequest req) {
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('coupon.manage')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }
}
