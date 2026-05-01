package io.smartpos.notification.application;

import io.smartpos.notification.api.dto.TemplateDto;
import io.smartpos.notification.domain.model.Channel;
import io.smartpos.notification.domain.model.NotificationTemplate;
import io.smartpos.notification.domain.repository.NotificationTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TemplateService {

    private final NotificationTemplateRepository repo;

    @Transactional(readOnly = true)
    public List<TemplateDto> list(String code, Channel channel) {
        return repo.findAll().stream()
                .filter(t -> code    == null || t.getCode().equalsIgnoreCase(code))
                .filter(t -> channel == null || t.getChannel() == channel)
                .map(TemplateDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public TemplateDto get(UUID id) {
        return repo.findById(id).map(TemplateDto::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Template not found"));
    }

    /**
     * Resolve the template the runtime should use for (tenant, code, channel).
     * Tenant-specific row wins; falls back to the global (tenant_id IS NULL) row.
     */
    @Transactional(readOnly = true)
    public Optional<NotificationTemplate> resolve(UUID tenantId, String code, Channel channel) {
        if (code == null) return Optional.empty();
        Optional<NotificationTemplate> tenant = (tenantId == null) ? Optional.empty()
                : repo.findFirstByTenantIdAndCodeAndChannelAndEnabledTrue(tenantId, code, channel);
        return tenant.or(() -> repo.findFirstByTenantIdIsNullAndCodeAndChannelAndEnabledTrue(code, channel));
    }

    @Transactional
    public TemplateDto create(TemplateDto.CreateRequest req) {
        NotificationTemplate t = NotificationTemplate.builder()
                .code(req.code())
                .channel(req.channel())
                .name(req.name())
                .subject(req.subject())
                .body(req.body())
                .html(Boolean.TRUE.equals(req.html()))
                .isDefault(Boolean.TRUE.equals(req.isDefault()))
                .enabled(req.enabled() == null || req.enabled())
                .build();
        return TemplateDto.from(repo.save(t));
    }

    @Transactional
    public TemplateDto update(UUID id, TemplateDto.UpdateRequest req) {
        NotificationTemplate t = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Template not found"));
        if (req.name()      != null) t.setName(req.name());
        if (req.subject()   != null) t.setSubject(req.subject());
        if (req.body()      != null) t.setBody(req.body());
        if (req.html()      != null) t.setHtml(req.html());
        if (req.isDefault() != null) t.setDefault(req.isDefault());
        if (req.enabled()   != null) t.setEnabled(req.enabled());
        return TemplateDto.from(repo.save(t));
    }

    @Transactional
    public void delete(UUID id) {
        if (!repo.existsById(id)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Template not found");
        }
        repo.deleteById(id);
    }
}
