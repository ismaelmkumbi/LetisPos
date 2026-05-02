package io.smartpos.product.api;

import io.smartpos.product.api.dto.BarcodeWithProductDto;
import io.smartpos.product.application.BarcodeService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/barcodes")
@RequiredArgsConstructor
public class BarcodeController {

    private final BarcodeService barcodeService;

    @GetMapping("/search")
    @PreAuthorize("hasAuthority('product.view')")
    public Page<BarcodeWithProductDto> search(@RequestParam(required = false) String search, Pageable pageable) {
        return barcodeService.search(search, pageable);
    }
}
