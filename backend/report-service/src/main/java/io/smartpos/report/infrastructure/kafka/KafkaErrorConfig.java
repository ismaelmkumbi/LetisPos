package io.smartpos.report.infrastructure.kafka;

import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.common.TopicPartition;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

/**
 * Wires a {@link DefaultErrorHandler} that retries failed records a few times
 * with a short fixed back-off, then routes the poison message to a Dead-Letter
 * Topic (DLT).
 *
 * <p>DLT naming: original topic + {@code .dlt}, e.g.
 * {@code smartpos.sales.sale-confirmed.v1.dlt}. Same partition where possible.
 *
 * <p>Ops can later attach a manual retry / inspection consumer to those topics
 * (or just use {@code kafka-console-consumer.sh} to triage them).
 *
 * <p>Without this bean, a poison record blocks the consumer indefinitely
 * because {@code manual_immediate} ack mode lets the offset stall.
 */
@Slf4j
@Configuration
public class KafkaErrorConfig {

    /** 3 immediate retries (~3s total) before routing to DLT. */
    private static final long RETRY_INTERVAL_MS = 1000L;
    private static final long MAX_RETRIES       = 3L;

    @Bean
    public DefaultErrorHandler kafkaErrorHandler(KafkaTemplate<String, String> template) {
        DeadLetterPublishingRecoverer recoverer = new DeadLetterPublishingRecoverer(
                template,
                (record, exception) -> {
                    String dltTopic = record.topic() + ".dlt";
                    log.warn("Routing poison message {}@{} → {} (cause: {})",
                            record.topic(), record.offset(), dltTopic,
                            exception.getCause() == null
                                    ? exception.getMessage()
                                    : exception.getCause().getMessage());
                    return new TopicPartition(dltTopic, record.partition());
                });

        DefaultErrorHandler handler = new DefaultErrorHandler(
                recoverer,
                new FixedBackOff(RETRY_INTERVAL_MS, MAX_RETRIES));

        // Don't retry on bad payloads — straight to DLT.
        handler.addNotRetryableExceptions(
                IllegalArgumentException.class,
                com.fasterxml.jackson.core.JsonProcessingException.class,
                com.fasterxml.jackson.databind.exc.MismatchedInputException.class);

        return handler;
    }
}
