package io.smartpos.product.infrastructure.config;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

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

    @Value("${smartpos.minio.bucket:smartpos-product-images}")
    private String bucket;

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
            log.warn("MinIO bucket check failed at {}: {}. " +
                    "Product image uploads will fail until storage is reachable.", endpoint, e.getMessage());
        }
    }

    public record MinioProperties(String bucket, int presignedTtlSeconds) {}
}
