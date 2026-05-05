package io.smartpos.product.infrastructure.storage;

import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.http.Method;
import io.smartpos.product.infrastructure.config.MinioConfig.MinioProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

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
        return client.getPresignedObjectUrl(GetPresignedObjectUrlArgs.builder()
                .method(Method.GET)
                .bucket(props.bucket())
                .object(key)
                .expiry(props.presignedTtlSeconds(), TimeUnit.SECONDS)
                .build());
    }
}
