package io.smartpos.integration.application.qb;

import io.smartpos.integration.application.IntegrationProperties;
import io.smartpos.integration.domain.model.IntegrationSync;
import io.smartpos.integration.domain.repository.IntegrationSyncRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * QuickBooks Online — Invoice + Payment sync.
 *
 * Endpoints (sandbox-or-prod via base-url):
 *   POST {base}/v3/company/{companyId}/invoice
 *   POST {base}/v3/company/{companyId}/payment
 *
 * OAuth2 token refresh is handled out-of-band — the access token in
 * application config is expected to be rotated by a separate scheduler
 * (TODO: implement RefreshTokenStore to encapsulate that).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class QuickBooksService {

    private final IntegrationProperties props;
    private final IntegrationSyncRepository syncRepo;
    private final WebClient http = WebClient.builder().build();

    @Transactional
    public IntegrationSync pushInvoice(UUID saleId, Map<String, Object> qbInvoicePayload) {
        if (!props.quickbooks().enabled()) {
            throw new IllegalStateException("QuickBooks integration disabled");
        }
        IntegrationSync sync = syncRepo.save(IntegrationSync.builder()
                .provider("QUICKBOOKS").direction("OUT")
                .entityType("Invoice").entityId(saleId)
                .requestBody(qbInvoicePayload.toString())
                .build());

        try {
            String url = props.quickbooks().baseUrl()
                    + "/v3/company/" + props.quickbooks().companyId() + "/invoice";

            @SuppressWarnings("unchecked")
            Map<String, Object> resp = http.post().uri(url)
                    .header("Authorization", "Bearer " + props.quickbooks().accessToken())
                    .header("Accept", "application/json")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(qbInvoicePayload)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .timeout(Duration.ofSeconds(30))
                    .block();

            sync.setStatus("OK");
            sync.setAttempts(sync.getAttempts() + 1);
            // QBO returns: { "Invoice": { "Id": "...", "DocNumber": "...", ... } }
            if (resp != null) {
                @SuppressWarnings("unchecked")
                Map<String, Object> inv = (Map<String, Object>) resp.get("Invoice");
                if (inv != null) sync.setExternalId(String.valueOf(inv.get("Id")));
                sync.setResponseBody(resp.toString());
            }
            sync.setCompletedAt(Instant.now());
        } catch (Exception e) {
            log.warn("QuickBooks invoice push failed: {}", e.getMessage());
            sync.setStatus("FAILED");
            sync.setAttempts(sync.getAttempts() + 1);
            sync.setErrorMessage(e.getMessage());
            sync.setNextRetryAt(Instant.now().plusSeconds(60L * (1L << Math.min(6, sync.getAttempts()))));
        }
        return syncRepo.save(sync);
    }
}
