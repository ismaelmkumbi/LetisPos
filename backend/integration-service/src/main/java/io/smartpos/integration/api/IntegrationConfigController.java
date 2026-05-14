package io.smartpos.integration.api;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.smartpos.common.context.TenantContext;
import io.smartpos.integration.domain.model.IntegrationConfig;
import io.smartpos.integration.domain.repository.IntegrationConfigRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/integrations/config")
@RequiredArgsConstructor
@Slf4j
public class IntegrationConfigController {

    private static final Set<String> VALID_PROVIDERS = Set.of("ZATCA", "WOOCOMMERCE", "QUICKBOOKS");
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final IntegrationConfigRepository configRepo;

    @GetMapping
    @PreAuthorize("hasAuthority('integration.view')")
    public ResponseEntity<List<IntegrationConfig>> getConfigs() {
        UUID tenantId = TenantContext.get().orElse(null);
        List<IntegrationConfig> configs = configRepo.findByTenantId(tenantId);

        // Ensure all known providers have a row
        for (String provider : VALID_PROVIDERS) {
            boolean exists = configs.stream().anyMatch(c -> c.getProvider().equals(provider));
            if (!exists) {
                configs.add(createDefault(tenantId, provider));
            }
        }

        return ResponseEntity.ok(configs);
    }

    @PutMapping("/{provider}")
    @PreAuthorize("hasAuthority('integration.view')")
    public ResponseEntity<IntegrationConfig> updateProvider(
            @PathVariable String provider,
            @RequestBody Map<String, Object> update) {

        String upperProvider = provider.toUpperCase();
        if (!VALID_PROVIDERS.contains(upperProvider)) {
            throw new IllegalArgumentException("Unknown provider: " + provider);
        }

        UUID tenantId = TenantContext.require();
        IntegrationConfig config = configRepo.findByTenantIdAndProvider(tenantId, upperProvider)
                .orElseGet(() -> createDefault(tenantId, upperProvider));

        if (update.containsKey("enabled")) {
            config.setEnabled((Boolean) update.get("enabled"));
        }
        if (update.containsKey("config")) {
            config.setConfig(toJson(update.get("config")));
        }

        return ResponseEntity.ok(configRepo.save(config));
    }

    private IntegrationConfig createDefault(UUID tenantId, String provider) {
        return configRepo.save(IntegrationConfig.builder()
                .tenantId(tenantId)
                .provider(provider)
                .enabled(false)
                .config("{}")
                .build());
    }

    private String toJson(Object obj) {
        if (obj instanceof String s) return s;
        try {
            return MAPPER.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            log.warn("Failed to serialise config value — storing as empty object", e);
            return "{}";
        }
    }
}
