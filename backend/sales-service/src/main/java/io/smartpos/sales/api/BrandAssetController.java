package io.smartpos.sales.api;

import io.smartpos.common.context.TenantContext;
import io.smartpos.sales.domain.model.BrandAsset;
import io.smartpos.sales.application.BrandAssetService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/brand/assets")
@RequiredArgsConstructor
public class BrandAssetController {

    private final BrandAssetService service;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<BrandAsset>> list(@RequestParam(required = false) String category) {
        UUID tenantId = TenantContext.require();
        return ResponseEntity.ok(service.list(tenantId, category));
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<BrandAsset> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "logo") String category,
            @RequestParam(required = false) String name) throws Exception {
        UUID tenantId = TenantContext.require();
        if (file.isEmpty()) throw new IllegalArgumentException("File is empty");
        if (file.getSize() > 10 * 1024 * 1024) throw new IllegalArgumentException("File must be under 10 MB");
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(service.upload(tenantId, file, category, name));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
