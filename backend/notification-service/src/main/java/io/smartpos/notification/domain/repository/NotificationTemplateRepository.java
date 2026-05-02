package io.smartpos.notification.domain.repository;

import io.smartpos.notification.domain.model.Channel;
import io.smartpos.notification.domain.model.NotificationTemplate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface NotificationTemplateRepository extends JpaRepository<NotificationTemplate, UUID> {

    /**
     * Resolve a template for (tenant, code, channel). The look-up first tries the
     * tenant-specific row; falls back to the global row (tenant_id IS NULL) so
     * out-of-the-box templates work even before tenants override them.
     */
    Optional<NotificationTemplate> findFirstByTenantIdAndCodeAndChannelAndEnabledTrue(
            UUID tenantId, String code, Channel channel);

    Optional<NotificationTemplate> findFirstByTenantIdIsNullAndCodeAndChannelAndEnabledTrue(
            String code, Channel channel);

    List<NotificationTemplate> findByCodeOrderByChannelAsc(String code);
}
