package io.smartpos.product.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.product.api.dto.BarcodeWithProductDto;
import io.smartpos.product.domain.model.Product;
import io.smartpos.product.domain.repository.ProductBarcodeRepository;
import io.smartpos.product.domain.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BarcodeService {

    private final ProductBarcodeRepository barcodeRepo;
    private final ProductRepository productRepo;

    @Transactional(readOnly = true)
    public Page<BarcodeWithProductDto> search(String search, Pageable pageable) {
        var barcodePage = barcodeRepo.search(search, TenantContext.require(), pageable);

        // Batch-load product names for all barcodes on this page
        var productIds = barcodePage.getContent().stream()
                .map(pb -> pb.getProductId())
                .filter(id -> id != null)
                .distinct()
                .collect(Collectors.toList());

        Map<UUID, Product> productMap = productIds.isEmpty()
                ? Map.of()
                : productRepo.findAllById(productIds).stream()
                        .collect(Collectors.toMap(Product::getId, p -> p));

        List<BarcodeWithProductDto> dtos = barcodePage.getContent().stream()
                .map(pb -> {
                    Product product = pb.getProductId() != null ? productMap.get(pb.getProductId()) : null;
                    return new BarcodeWithProductDto(
                            pb.getId(),
                            pb.getVariantId(),
                            pb.getBarcode(),
                            pb.getBarcodeType().name(),
                            pb.isPrimary(),
                            pb.getProductId(),
                            product != null ? product.getName() : null,
                            product != null ? product.getCode() : null
                    );
                })
                .collect(Collectors.toList());

        return new PageImpl<>(dtos, pageable, barcodePage.getTotalElements());
    }
}
