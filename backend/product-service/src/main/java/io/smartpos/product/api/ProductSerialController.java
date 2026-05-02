package io.smartpos.product.api;

import io.smartpos.product.api.dto.SerialDto;
import io.smartpos.product.application.ProductSerialService;
import io.smartpos.product.domain.model.SerialStatus;
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
@RequestMapping("/api/v1/serials")
@RequiredArgsConstructor
public class ProductSerialController {

    private final ProductSerialService service;

    @GetMapping
    @PreAuthorize("hasAuthority('product.view')")
    public Page<SerialDto> search(@RequestParam(required = false) UUID productId,
                                  @RequestParam(required = false) UUID warehouseId,
                                  @RequestParam(required = false) SerialStatus status,
                                  @RequestParam(required = false) String search,
                                  Pageable pageable) {
        return service.search(productId, warehouseId, status, search, pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('product.view')")
    public SerialDto get(@PathVariable UUID id) { return service.get(id); }

    /** POS path: scan an IMEI/serial and resolve to its registered product. */
    @GetMapping("/by-number/{serialNumber}")
    @PreAuthorize("hasAuthority('product.view') or hasAuthority('pos.use')")
    public SerialDto byNumber(@PathVariable String serialNumber) {
        return service.findByNumber(serialNumber);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('product.update')")
    public ResponseEntity<SerialDto> create(@Valid @RequestBody SerialDto.CreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @PostMapping("/bulk")
    @PreAuthorize("hasAuthority('product.update')")
    public List<SerialDto> createBulk(@Valid @RequestBody List<SerialDto.CreateRequest> reqs) {
        return service.createBulk(reqs);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('product.update')")
    public SerialDto updateStatus(@PathVariable UUID id, @Valid @RequestBody SerialDto.StatusUpdate update) {
        return service.updateStatus(id, update);
    }

    /** Internal endpoint for sales-service to flag serials sold against a sale. */
    @PostMapping("/internal/mark-sold")
    @PreAuthorize("hasAuthority('internal.serial.write')")
    public ResponseEntity<Void> markSold(@RequestParam String saleRef,
                                         @RequestBody List<UUID> serialIds) {
        service.markSold(serialIds, saleRef);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/internal/mark-returned")
    @PreAuthorize("hasAuthority('internal.serial.write')")
    public ResponseEntity<Void> markReturned(@RequestParam String saleRef) {
        service.markReturned(saleRef);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('product.delete')")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) { service.delete(id); }
}
