package io.smartpos.report.infrastructure.kafka;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.admin.ListConsumerGroupOffsetsResult;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.common.TopicPartition;
import org.springframework.boot.autoconfigure.kafka.KafkaProperties;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

/**
 * Periodically checks Kafka consumer-group lag, including dead-letter topics.
 * Logs warnings when DLT messages accumulate — Prometheus alerting rules
 * (prometheus-rules.yml DltBacklog) provide the alerting integration.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DltMonitor {

    private final KafkaProperties kafkaProps;

    @Scheduled(fixedDelay = 300_000) // every 5 minutes
    public void reportDltLag() {
        Map<String, Object> adminConfig = Map.of(
                ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG,
                kafkaProps.getBootstrapServers());
        try (AdminClient admin = AdminClient.create(adminConfig)) {
            var groups = admin.listConsumerGroups().all()
                    .get(10, TimeUnit.SECONDS);
            for (var g : groups) {
                String groupId = g.groupId();
                if (!groupId.contains("dlt") && !groupId.contains("dead")) continue;
                try {
                    ListConsumerGroupOffsetsResult offsets =
                            admin.listConsumerGroupOffsets(groupId);
                    Map<TopicPartition, Long> lag =
                            offsets.partitionsToOffsetAndMetadata()
                                    .get(10, TimeUnit.SECONDS)
                                    .entrySet().stream()
                                    .collect(java.util.stream.Collectors.toMap(
                                            Map.Entry::getKey,
                                            e -> e.getValue() != null ? e.getValue().offset() : 0L));
                    long totalLag = lag.values().stream().mapToLong(Long::longValue).sum();
                    if (totalLag > 0) {
                        log.warn("DLT backlog: group={} lag={} partitions={}",
                                groupId, totalLag, lag.size());
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                } catch (ExecutionException | TimeoutException e) {
                    log.debug("Could not fetch offsets for group {}: {}", groupId, e.getMessage());
                }
            }
        } catch (Exception e) {
            log.debug("DLT lag check skipped: {}", e.getMessage());
        }
    }
}
