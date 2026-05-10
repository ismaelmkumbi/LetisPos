package io.smartpos.documents.infrastructure.config;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Slf4j
@Configuration
@ConfigurationProperties(prefix = "smartpos.minio")
public class MinioConfig {

    @Getter
    private String endpoint = "http://localhost:9000";
    @Getter
    private String accessKey = "smartpos";
    @Getter
    private String secretKey = "smartpos-secret";
    @Getter
    private String bucket = "smartpos-documents";
    @Getter
    private int presignedTtlSeconds = 3600;

    public void setEndpoint(String endpoint) { this.endpoint = endpoint; }
    public void setAccessKey(String accessKey) { this.accessKey = accessKey; }
    public void setSecretKey(String secretKey) { this.secretKey = secretKey; }
    public void setBucket(String bucket) { this.bucket = bucket; }
    public void setPresignedTtlSeconds(int presignedTtlSeconds) { this.presignedTtlSeconds = presignedTtlSeconds; }

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
            MinioClient client = MinioClient.builder()
                    .endpoint(endpoint)
                    .credentials(accessKey, secretKey)
                    .build();
            boolean exists = client.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
            if (!exists) {
                client.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
                log.info("Created MinIO bucket: {}", bucket);
            }
        } catch (Exception e) {
            log.warn("Could not ensure MinIO bucket '{}': {}", bucket, e.getMessage());
        }
    }
}
