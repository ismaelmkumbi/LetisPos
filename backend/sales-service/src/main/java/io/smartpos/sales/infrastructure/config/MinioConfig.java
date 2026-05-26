package io.smartpos.sales.infrastructure.config;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Slf4j
@Configuration
public class MinioConfig {

    @Value("${smartpos.minio.endpoint:http://localhost:9000}")
    private String endpoint;

    @Value("${smartpos.minio.access-key:smartpos}")
    private String accessKey;

    @Value("${smartpos.minio.secret-key:smartpos-secret}")
    private String secretKey;

    @Value("${smartpos.minio.bucket:smartpos-product-images}")
    private String bucket;

    @Bean
    public MinioClient minioClient() {
        return MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey)
                .build();
    }

    @PostConstruct
    void ensureBucket() {
        try {
            MinioClient client = minioClient();
            boolean exists = client.bucketExists(
                    BucketExistsArgs.builder().bucket(bucket).build());
            if (!exists) {
                client.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
                log.info("Created MinIO bucket '{}'", bucket);
            }
        } catch (Exception e) {
            log.warn("MinIO bucket check failed at {}: {}", endpoint, e.getMessage());
        }
    }
}
