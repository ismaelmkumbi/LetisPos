package io.smartpos.sales.infrastructure.kafka;

import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.common.TopicPartition;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.util.backoff.FixedBackOff;

/**
 * Retries a failed record 3 times (~3s total) then publishes to
 * {@code <original-topic>.dlt}. See full rationale in the matching class in
 * report-service — same configuration, kept in-service to avoid a circular
 * dependency on the outbox-relay library.
 */
@Slf4j
@Configuration
public class KafkaErrorConfig {

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

        handler.addNotRetryableExceptions(
                IllegalArgumentException.class,
                com.fasterxml.jackson.core.JsonProcessingException.class,
                com.fasterxml.jackson.databind.exc.MismatchedInputException.class);

        return handler;
    }
}
