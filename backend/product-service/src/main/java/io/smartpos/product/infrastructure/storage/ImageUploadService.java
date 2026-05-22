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
        String presigned = client.getPresignedObjectUrl(GetPresignedObjectUrlArgs.builder()
                .method(Method.GET)
                .bucket(props.bucket())
                .object(key)
                .expiry(props.presignedTtlSeconds(), TimeUnit.SECONDS)
                .build());

        // Rewrite internal URL → public URL so browser can load the image
        if (props.publicEndpoint() != null && !props.publicEndpoint().isBlank()) {
            // Extract path+query from internal presigned URL and prefix with public endpoint
            int pathIdx = presigned.indexOf('/', 9); // skip "http://" then find first /
            if (pathIdx > 0) {
                presigned = props.publicEndpoint().replaceAll("/$", "") + presigned.substring(pathIdx);
            }
        }
        return presigned;
    }
}
