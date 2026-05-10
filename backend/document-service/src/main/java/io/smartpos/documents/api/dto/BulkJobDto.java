package io.smartpos.documents.api.dto;

import io.smartpos.documents.domain.model.BulkJob;
import lombok.Builder;
import lombok.Data;
import java.time.Instant;
import java.util.UUID;

@Data
@Builder
public class BulkJobDto {
    private UUID id;
    private String status;
    private int progress;
    private int total;
    private Instant createdAt;

    public static BulkJobDto from(BulkJob job) {
        return BulkJobDto.builder()
                .id(job.getId())
                .status(job.getStatus())
                .progress(job.getProgress())
                .total(job.getTotal())
                .createdAt(job.getCreatedAt())
                .build();
    }
}
