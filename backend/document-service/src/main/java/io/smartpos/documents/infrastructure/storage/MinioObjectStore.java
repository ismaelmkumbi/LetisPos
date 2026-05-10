package io.smartpos.documents.infrastructure.storage;

import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.http.Method;
import io.smartpos.documents.infrastructure.config.MinioConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.util.concurrent.TimeUnit;

@Component
@RequiredArgsConstructor
public class MinioObjectStore {

    private final MinioClient client;
    private final MinioConfig config;

    public String upload(String objectKey, byte[] bytes, String contentType) throws Exception {
        try (ByteArrayInputStream in = new ByteArrayInputStream(bytes)) {
            client.putObject(PutObjectArgs.builder()
                    .bucket(config.getBucket())
                    .object(objectKey)
                    .stream(in, bytes.length, -1)
                    .contentType(contentType)
                    .build());
        }
        return objectKey;
    }

    public String presignedGetUrl(String objectKey) throws Exception {
        return client.getPresignedObjectUrl(GetPresignedObjectUrlArgs.builder()
                .method(Method.GET)
                .bucket(config.getBucket())
                .object(objectKey)
                .expiry(config.getPresignedTtlSeconds(), TimeUnit.SECONDS)
                .build());
    }
}
