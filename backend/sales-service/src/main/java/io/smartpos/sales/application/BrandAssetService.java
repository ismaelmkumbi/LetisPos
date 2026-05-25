package io.smartpos.sales.application;

import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.smartpos.common.context.TenantContext;
import io.smartpos.sales.domain.model.BrandAsset;
import io.smartpos.sales.domain.repository.BrandAssetRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BrandAssetService {

    private final BrandAssetRepository repo;
    private final MinioClient minio;

    @Value("${smartpos.minio.bucket:smartpos-product-images}")
    private String bucket;

    @Value("${smartpos.minio.public-endpoint:#{null}}")
    private String publicEndpoint;

    @Transactional(readOnly = true)
    public List<BrandAsset> list(UUID tenantId, String category) {
        if (category != null && !category.isBlank())
            return repo.findByTenantIdAndCategoryOrderByCreatedAtDesc(tenantId, category);
        return repo.findByTenantIdOrderByCreatedAtDesc(tenantId);
    }

    @Transactional
    public BrandAsset upload(UUID tenantId, MultipartFile file, String category, String name) throws Exception {
        String ext = extension(file.getContentType());
        String key = "brand/" + tenantId + "/" + UUID.randomUUID() + "." + ext;

        minio.putObject(PutObjectArgs.builder()
            .bucket(bucket)
            .object(key)
            .stream(file.getInputStream(), file.getSize(), -1)
            .contentType(file.getContentType())
            .build());

        String url = buildPublicUrl(key);

        BrandAsset asset = BrandAsset.builder()
            .tenantId(tenantId)
            .name(name != null ? name : file.getOriginalFilename())
            .category(category != null ? category : "logo")
            .format(ext)
            .variant("original")
            .url(url)
            .sizeBytes(file.getSize())
            .build();
        return repo.save(asset);
    }

    @Transactional
    public void delete(UUID id) {
        repo.deleteById(id);
    }

    private String buildPublicUrl(String key) {
        if (publicEndpoint != null && !publicEndpoint.isBlank()) {
            return publicEndpoint.replaceAll("/$", "") + "/" + bucket + "/" + key;
        }
        return key;
    }

    private String extension(String contentType) {
        if (contentType == null) return "png";
        return switch (contentType) {
            case "image/svg+xml" -> "svg";
            case "image/jpeg" -> "jpg";
            case "image/webp" -> "webp";
            default -> "png";
        };
    }
}
