package io.smartpos.hub.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "metric_points")
@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class MetricPoint {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false)
    private Instant time;
    @Column(nullable = false)
    private String serverName;
    private Double cpuPercent;
    private Long memUsedBytes;
    private Long memTotalBytes;
    private Long diskUsedBytes;
    private Long diskTotalBytes;
    private Long netRxBytes;
    private Long netTxBytes;
    private Double load1;
    private Double load5;
    private Double load15;
}
