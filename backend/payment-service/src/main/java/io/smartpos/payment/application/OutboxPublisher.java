package io.smartpos.payment.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.smartpos.payment.domain.model.OutboxEvent;
import io.smartpos.payment.domain.repository.OutboxRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class OutboxPublisher {

    private final OutboxRepository outboxRepo;
    private final ObjectMapper mapper;

    public void publish(String aggregateType, UUID aggregateId, String eventType, Object payload) {
        publish(aggregateType, aggregateId, eventType, payload, null);
    }

    public void publish(String aggregateType, UUID aggregateId, String eventType, Object payload, UUID tenantId) {
        try {
            OutboxEvent.OutboxEventBuilder builder = OutboxEvent.builder()
                    .aggregateType(aggregateType)
                    .aggregateId(aggregateId)
                    .eventType(eventType)
                    .payload(mapper.writeValueAsString(payload));
            if (tenantId != null) {
                builder.tenantId(tenantId);
            }
            outboxRepo.save(builder.build());
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Outbox serialize failed", e);
        }
    }
}
