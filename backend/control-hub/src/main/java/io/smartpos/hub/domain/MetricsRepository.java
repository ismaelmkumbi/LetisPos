package io.smartpos.hub.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.List;

public interface MetricsRepository extends JpaRepository<MetricPoint, Long> {

    @Query("""
        SELECT m FROM MetricPoint m
        WHERE m.serverName = :server
        AND m.time >= :from AND m.time <= :to
        ORDER BY m.time ASC
    """)
    List<MetricPoint> findByServerAndTimeRange(
        @Param("server") String server,
        @Param("from") Instant from,
        @Param("to") Instant to
    );

    @Query(value = """
        SELECT DISTINCT server_name FROM metric_points
        ORDER BY server_name
    """, nativeQuery = true)
    List<String> findDistinctServerNames();
}
