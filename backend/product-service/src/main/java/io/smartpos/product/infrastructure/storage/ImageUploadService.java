package io.smartpos.product.infrastructure.storage;

import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.smartpos.product.infrastructure.config.MinioConfig.MinioProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class ImageUploadService {

    private final MinioClient client;
    private final MinioProperties props;

    public String upload(byte[] bytes, String extension, String contentType) throws Exception {
        String key = "products/" + UUID.randomUUID() + "." + extension;
        try (ByteArrayInputStream in = new ByteArrayInputStream(bytes)) {
            client.putObject(PutObjectArgs.builder()
                    .bucket(props.bucket())
                    .object(key)
                    .stream(in, bytes.length, -1)
                    .contentType(contentType)
                    .build());
        }

        // Bucket is publicly readable — return direct URL, no pre-signed params needed.
        String base = props.publicEndpoint() != null && !props.publicEndpoint().isBlank()
                ? props.publicEndpoint().replaceAll("/$", "")
                : "http://localhost:9000";
        return base + "/" + props.bucket() + "/" + key;
    }
}
