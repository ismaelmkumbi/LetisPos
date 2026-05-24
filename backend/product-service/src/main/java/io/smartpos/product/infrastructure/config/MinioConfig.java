package io.smartpos.product.infrastructure.config;

import io.minio.BucketExistsArgs;
import io.minio.MakeBucketArgs;
import io.minio.MinioClient;
import io.minio.SetBucketPolicyArgs;
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

    @Value("${smartpos.minio.public-endpoint:#{null}}")
    private String publicEndpoint;

    @Bean
    public MinioClient minioClient() {
        return MinioClient.builder()
                .endpoint(endpoint)
                .credentials(accessKey, secretKey)
                .build();
    }

    @Bean
    public MinioProperties minioProperties() {
        return new MinioProperties(bucket, presignedTtlSeconds, publicEndpoint);
    }


    public record MinioProperties(String bucket, int presignedTtlSeconds, String publicEndpoint) {}

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
            // Product images are public — set anonymous download policy.
            setAnonymousDownloadPolicy(client, bucket);
        } catch (Exception e) {
            log.warn("MinIO bucket check failed at {}: {}. " +
                    "Product image uploads will fail until storage is reachable.", endpoint, e.getMessage());
        }
    }

    /** Set bucket policy to allow public read (product images are not sensitive). */
    private void setAnonymousDownloadPolicy(MinioClient client, String bucketName) {
        try {
            String policy = """
                {
                  "Version": "2012-10-17",
                  "Statement": [
                    {
                      "Effect": "Allow",
                      "Principal": {"AWS": ["*"]},
                      "Action": ["s3:GetObject"],
                      "Resource": ["arn:aws:s3:::%s/*"]
                    }
                  ]
                }
                """.formatted(bucketName);
            client.setBucketPolicy(
                SetBucketPolicyArgs.builder()
                    .bucket(bucketName)
                    .config(policy)
                    .build());
            log.info("Applied anonymous download policy to bucket '{}'", bucketName);
        } catch (Exception e) {
            log.warn("Failed to set anonymous download policy on bucket '{}': {}", bucketName, e.getMessage());
        }
    }

}
