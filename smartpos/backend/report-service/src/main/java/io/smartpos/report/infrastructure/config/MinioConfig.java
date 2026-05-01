package io.smartpos.report.infrastructure.config;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Wires up the MinIO Java client used by the async export worker.
 *
 * <p>Buckets are created on startup if missing — convenient for local docker-compose
 * environments. In production, ops typically pre-creates the bucket with a lifecycle
 * policy (auto-delete after N days) and revoked write perms outside this service.
 */
@Slf4j
@Configuration
@ConfigurationProperties(prefix = "smartpos.minio")
public class MinioConfig {

    @Value("${smartpos.minio.endpoint:http://localhost:9000}")
    private String endpoint;

    @Value("${smartpos.minio.access-key:smartpos}")
    private String accessKey;

    @Value("${smartpos.minio.secret-key:smartpos-secret}")
    private String secretKey;

    @Value("${smartpos.minio.bucket:smartpos-exports}")
    private String bucket;

    /** Presigned URL TTL in seconds. Default 1 hour. */
    @Value("${smartpos.minio.presigned-ttl-seconds:3600}")
    private int presignedTtlSeconds;

    @Bean
    public MinioClient minioClient() {
        return MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey)
                .build();
    }

    @Bean
    public MinioProperties minioProperties() {
        return new MinioProperties(bucket, presignedTtlSeconds);
    }

    @PostConstruct
    void ensureBucket() {
        try {
            MinioClient client = minioClient();
            boolean exists = client.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
            if (!exists) {
                client.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
                log.info("Created MinIO bucket '{}'", bucket);
            } else {
                log.info("MinIO bucket '{}' already exists", bucket);
            }
        } catch (Exception e) {
            // Don't crash the service — exports will simply fail with a meaningful error
            log.warn("MinIO bucket check failed at {}: {}. " +
                    "Async exports will fail until storage is reachable.", endpoint, e.getMessage());
        }
    }

    /** Simple holder injected into worker beans. */
    public record MinioProperties(String bucket, int presignedTtlSeconds) {}
}
