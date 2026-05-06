package io.smartpos.integration.application.woo;

import io.smartpos.common.context.TenantContext;
import io.smartpos.integration.application.IntegrationProperties;
import io.smartpos.integration.domain.model.IntegrationSync;
import io.smartpos.integration.domain.repository.IntegrationSyncRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;

/**
 * WooCommerce REST API v3 — bi-directional sync.
 *
 * Outbound: pushes Product / Stock updates whenever the corresponding
 * domain events arrive (wired separately as Kafka consumers, omitted here).
 *
 * Inbound: WordPress webhooks hit /webhooks/woocommerce — the controller
 * is permitAll'd in SecurityConfig and verified by HMAC SHA256 (header
 * {@code x-wc-webhook-signature}) before persisting an IntegrationSync row.
 *
 * Auth model: HTTP Basic with WooCommerce consumer key / secret.
 * Endpoint: {site_url}/wp-json/wc/v3/{products,orders,...}
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WooCommerceService {

    private final IntegrationProperties props;
    private final IntegrationSyncRepository syncRepo;
    private final WebClient http = WebClient.builder().build();

    @Transactional
    public IntegrationSync pushProduct(UUID productId, Map<String, Object> payload) {
        if (!props.woocommerce().enabled()) {
            throw new IllegalStateException("WooCommerce integration disabled");
        }
        IntegrationSync sync = syncRepo.save(IntegrationSync.builder()
                .provider("WOOCOMMERCE").direction("OUT")
                .entityType("Product").entityId(productId)
                .requestBody(payload.toString())
                .tenantId(TenantContext.require())
                .build());

        try {
            String url  = props.woocommerce().siteUrl() + "/wp-json/wc/v3/products";
            String auth = Base64.getEncoder().encodeToString(
                    (props.woocommerce().consumerKey() + ":" + props.woocommerce().consumerSecret())
                            .getBytes(StandardCharsets.UTF_8));

            @SuppressWarnings("unchecked")
            Map<String, Object> resp = http.post().uri(url)
                    .header("Authorization", "Basic " + auth)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(payload)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(30))
                    .block();

            sync.setStatus("OK");
            sync.setAttempts(sync.getAttempts() + 1);
            sync.setExternalId(resp == null ? null : String.valueOf(resp.get("id")));
            sync.setResponseBody(resp == null ? null : resp.toString());
            sync.setCompletedAt(Instant.now());
        } catch (Exception e) {
            log.warn("WooCommerce push failed: {}", e.getMessage());
            sync.setStatus("FAILED");
            sync.setAttempts(sync.getAttempts() + 1);
            sync.setErrorMessage(e.getMessage());
            sync.setNextRetryAt(Instant.now().plusSeconds(60L * (1L << Math.min(6, sync.getAttempts()))));
        }
        return syncRepo.save(sync);
    }

    /** Inbound webhook handler entry point — caller verifies HMAC first. */
    @Transactional
    public IntegrationSync recordInbound(String entityType, String externalId, String body) {
        return syncRepo.save(IntegrationSync.builder()
                .provider("WOOCOMMERCE").direction("IN")
                .entityType(entityType).externalId(externalId)
                .requestBody(body).status("OK")
                .completedAt(Instant.now())
                .build());
    }
}
