package io.smartpos.notification.domain.repository;

import io.smartpos.notification.domain.model.Channel;
import io.smartpos.notification.domain.model.DeliveryStatus;
import io.smartpos.notification.domain.model.NotificationDelivery;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface NotificationDeliveryRepository extends JpaRepository<NotificationDelivery, UUID> {

    @Query("""
           SELECT d FROM NotificationDelivery d
           WHERE d.tenantId = :tenantId
             AND (:channel IS NULL OR d.channel = :channel)
             AND (:status  IS NULL OR d.status  = :status)
             AND (COALESCE(:recipient,'') = '' OR LOWER(d.recipient) LIKE LOWER(CONCAT('%', :recipient, '%')))
           ORDER BY d.createdAt DESC
           """)
    Page<NotificationDelivery> search(@Param("channel")   Channel channel,
                                      @Param("status")    DeliveryStatus status,
                                      @Param("recipient") String recipient,
                                      @Param("tenantId")  UUID tenantId,
                                      Pageable pageable);

    /**
     * Pick failed deliveries whose next_retry_at has elapsed.
     * Limited at the SQL level via Pageable to avoid loading the whole queue.
     */
    @Query("""
           SELECT d FROM NotificationDelivery d
           WHERE d.status = io.smartpos.notification.domain.model.DeliveryStatus.FAILED
             AND d.nextRetryAt IS NOT NULL
             AND d.nextRetryAt <= :now
             AND d.attempts < :maxAttempts
           ORDER BY d.nextRetryAt ASC
           """)
    List<NotificationDelivery> findRetryable(@Param("now") Instant now,
                                             @Param("maxAttempts") int maxAttempts,
                                             Pageable pageable);

    @Query("SELECT d FROM NotificationDelivery d WHERE d.tenantId = :tenantId AND d.relatedAggregate = :aggregate AND d.relatedAggregateId = :aggregateId ORDER BY d.createdAt DESC")
    List<NotificationDelivery> findByRelatedAggregateAndRelatedAggregateId(@Param("aggregate") String aggregate,
                                                                            @Param("aggregateId") UUID aggregateId,
                                                                            @Param("tenantId") UUID tenantId);
}
