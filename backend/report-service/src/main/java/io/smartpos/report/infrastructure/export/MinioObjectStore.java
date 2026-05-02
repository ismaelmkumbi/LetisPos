package io.smartpos.report.infrastructure.export;

import io.minio.GetPresignedObjectUrlArgs;
import io.minio.MinioClient;
import io.minio.PutObjectArgs;
import io.minio.http.Method;
import io.smartpos.report.infrastructure.config.MinioConfig.MinioProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.util.concurrent.TimeUnit;

/**
 * Uploads rendered export bytes to MinIO and hands back a time-limited presigned
 * URL the frontend can hit directly without going through the API gateway.
 *
 * <p>Object key layout: {@code exports/{yyyy-MM-dd}/{jobId}.{ext}} — easy lifecycle
 * cleanup via S3 prefix rules.
 */
@Component
@RequiredArgsConstructor
public class MinioObjectStore {

    private final MinioClient client;
    private final MinioProperties props;

    /** Returns the object key (relative path inside the bucket). */
    public String upload(String objectKey, byte[] bytes, String contentType) throws Exception {
        try (ByteArrayInputStream in = new ByteArrayInputStream(bytes)) {
            client.putObject(PutObjectArgs.builder()
                    .bucket(props.bucket())
                    .object(objectKey)
                    .stream(in, bytes.length, -1)
                    .contentType(contentType)
                    .build());
        }
        return objectKey;
    }

    /**
     * Generates a GET presigned URL valid for {@code presigned-ttl-seconds}.
     * The frontend can use this URL directly — no auth header needed.
     */
    public String presignedGetUrl(String objectKey) throws Exception {
        return client.getPresignedObjectUrl(GetPresignedObjectUrlArgs.builder()
                .method(Method.GET)
                .bucket(props.bucket())
                .object(objectKey)
                .expiry(props.presignedTtlSeconds(), TimeUnit.SECONDS)
                .build());
    }
}
