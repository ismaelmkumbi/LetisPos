package io.smartpos.documents.infrastructure.template;

import io.smartpos.documents.domain.model.TemplateOverride;
import io.smartpos.documents.domain.repository.TemplateOverrideRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class TemplateResolver {

    private final TemplateOverrideRepository overrideRepo;

    public String resolve(UUID tenantId, String documentType, String classpathTemplateName)
            throws IOException {
        Optional<TemplateOverride> override = overrideRepo
                .findByTenantIdAndDocumentTypeAndIsActiveTrue(tenantId, documentType);

        if (override.isPresent()) {
            log.debug("Using DB override for tenant={} type={}", tenantId, documentType);
            return override.get().getBodyHtml();
        }

        log.debug("Using classpath default for type={}", documentType);
        var resource = getClass().getClassLoader()
                .getResourceAsStream("templates/" + classpathTemplateName);
        if (resource == null) {
            throw new IOException("Template not found: templates/" + classpathTemplateName);
        }
        return new String(resource.readAllBytes(), StandardCharsets.UTF_8);
    }
}
