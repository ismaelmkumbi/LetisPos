package io.smartpos.hub.application;

import io.smartpos.hub.domain.MetricPoint;
import io.smartpos.hub.domain.MetricsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class MetricsService {
    private final MetricsRepository repo;

    @Transactional
    public void store(String serverName, Map<String, Object> metrics) {
        MetricPoint mp = MetricPoint.builder()
            .time(Instant.now())
            .serverName(serverName)
            .cpuPercent(toDouble(metrics.get("cpu_percent")))
            .memUsedBytes(toLong(metrics.get("mem_used_bytes")))
            .memTotalBytes(toLong(metrics.get("mem_total_bytes")))
            .diskUsedBytes(toLong(metrics.get("disk_used_bytes")))
            .diskTotalBytes(toLong(metrics.get("disk_total_bytes")))
            .netRxBytes(toLong(metrics.get("net_rx_bytes")))
            .netTxBytes(toLong(metrics.get("net_tx_bytes")))
            .load1(toDouble(metrics.get("load1")))
            .load5(toDouble(metrics.get("load5")))
            .load15(toDouble(metrics.get("load15")))
            .build();
        repo.save(mp);
    }

    public List<MetricPoint> query(String server, Instant from, Instant to) {
        return repo.findByServerAndTimeRange(server, from, to);
    }

    public List<String> serverNames() {
        return repo.findDistinctServerNames();
    }

    private Double toDouble(Object v) {
        if (v instanceof Number n) return n.doubleValue();
        return null;
    }

    private Long toLong(Object v) {
        if (v instanceof Number n) return n.longValue();
        return null;
    }
}
