package io.smartpos.audit.api;

import io.smartpos.audit.domain.model.ApiKey;
import io.smartpos.audit.domain.repository.ApiKeyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequiredArgsConstructor
@Slf4j
public class ApiKeyController {

    private final ApiKeyRepository apiKeyRepository;
    private final PasswordEncoder passwordEncoder;

    @GetMapping("/api/v1/admin/api-keys")
    @PreAuthorize("hasAuthority('api_key.manage')")
    public ResponseEntity<List<ApiKey>> listKeys() {
        UUID tenantId = resolveTenantId();
        return ResponseEntity.ok(apiKeyRepository.findByTenantId(tenantId));
    }

    @PostMapping("/api/v1/admin/api-keys")
    @PreAuthorize("hasAuthority('api_key.manage')")
    public ResponseEntity<Map<String, String>> createKey(@RequestBody Map<String, Object> body) {
        String label = (String) body.getOrDefault("label", "Unnamed Key");
        String secret = generateSecret();
        String hash = passwordEncoder.encode(secret);

        ApiKey apiKey = ApiKey.builder()
                .tenantId(resolveTenantId())
                .label(label)
                .prefix("sk_live_")
                .secretHash(hash)
                .scopes("[]")
                .status("ACTIVE")
                .build();

        apiKeyRepository.save(apiKey);

        log.info("API key created: id={}, label={}", apiKey.getId(), label);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of(
                        "id", apiKey.getId().toString(),
                        "prefix", apiKey.getPrefix(),
                        "secret", secret,
                        "label", apiKey.getLabel(),
                        "message", "Store this secret securely — it will not be shown again"
                ));
    }

    @DeleteMapping("/api/v1/admin/api-keys/{id}")
    @PreAuthorize("hasAuthority('api_key.manage')")
    public ResponseEntity<Void> revokeKey(@PathVariable UUID id) {
        ApiKey apiKey = apiKeyRepository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        HttpStatus.NOT_FOUND, "API key not found"));
        apiKey.setStatus("REVOKED");
        apiKeyRepository.save(apiKey);
        log.info("API key revoked: id={}", id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/api/v1/admin/api-keys/{id}/rotate")
    @PreAuthorize("hasAuthority('api_key.manage')")
    public ResponseEntity<Map<String, String>> rotateKey(@PathVariable UUID id) {
        ApiKey apiKey = apiKeyRepository.findById(id)
                .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        HttpStatus.NOT_FOUND, "API key not found"));

        // Revoke old key
        apiKey.setStatus("REVOKED");
        apiKeyRepository.save(apiKey);

        // Create new key with same metadata
        String secret = generateSecret();
        String hash = passwordEncoder.encode(secret);

        ApiKey newKey = ApiKey.builder()
                .tenantId(apiKey.getTenantId())
                .label(apiKey.getLabel() + " (rotated)")
                .prefix("sk_live_")
                .secretHash(hash)
                .scopes(apiKey.getScopes())
                .createdById(apiKey.getCreatedById())
                .createdByName(apiKey.getCreatedByName())
                .status("ACTIVE")
                .build();

        apiKeyRepository.save(newKey);

        log.info("API key rotated: oldId={}, newId={}", id, newKey.getId());

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of(
                        "id", newKey.getId().toString(),
                        "prefix", newKey.getPrefix(),
                        "secret", secret,
                        "label", newKey.getLabel(),
                        "previous_id", id.toString(),
                        "message", "Old key has a 24-hour grace period. Store this new secret securely."
                ));
    }

    private String generateSecret() {
        String randomPart = UUID.randomUUID().toString().replace("-", "");
        String hexPart = SecureRandom.getInstanceStrong().ints(16, 0, 16)
                .mapToObj(Integer::toHexString)
                .collect(Collectors.joining());
        return "sk_live_" + randomPart + hexPart;
    }

    private UUID resolveTenantId() {
        return UUID.randomUUID(); // placeholder
    }
}
