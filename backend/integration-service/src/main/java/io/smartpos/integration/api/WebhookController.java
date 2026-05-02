package io.smartpos.integration.api;

import io.smartpos.integration.application.IntegrationProperties;
import io.smartpos.integration.application.woo.WooCommerceService;
import io.smartpos.integration.domain.model.IntegrationSync;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

/**
 * Inbound webhooks. Mounted under /webhooks/** which is permitAll'd in
 * SecurityConfig — every handler here MUST verify a per-provider signature
 * before persisting anything.
 */
@Slf4j
@RestController
@RequestMapping("/webhooks")
@RequiredArgsConstructor
public class WebhookController {

    private final WooCommerceService woo;
    private final IntegrationProperties props;

    /**
     * WooCommerce webhook. WooCommerce signs the body with HMAC-SHA256 using
     * the consumer secret and sends it in {@code x-wc-webhook-signature} as
     * a base64 string.
     */
    @PostMapping("/woocommerce")
    public ResponseEntity<?> woo(@RequestHeader(value = "x-wc-webhook-signature", required = false) String signature,
                                 @RequestHeader(value = "x-wc-webhook-topic",     required = false) String topic,
                                 @RequestHeader(value = "x-wc-webhook-resource",  required = false) String resource,
                                 @RequestHeader(value = "x-wc-webhook-id",        required = false) String externalId,
                                 @RequestBody String body) {
        String secret = props.woocommerce().consumerSecret();
        if (secret == null || secret.isBlank() || signature == null || !verifyHmacSha256(body, secret, signature)) {
            log.warn("Rejecting WooCommerce webhook: invalid signature for topic {}", topic);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid signature");
        }
        IntegrationSync sync = woo.recordInbound(resource == null ? "Unknown" : resource, externalId, body);
        return ResponseEntity.ok(sync.getId());
    }

    private static boolean verifyHmacSha256(String body, String secret, String expectedBase64) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal(body.getBytes(StandardCharsets.UTF_8));
            String computed = Base64.getEncoder().encodeToString(digest);
            return constantTimeEquals(computed, expectedBase64);
        } catch (Exception e) {
            log.warn("HMAC verify failed: {}", e.getMessage());
            return false;
        }
    }

    private static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null || a.length() != b.length()) return false;
        int diff = 0;
        for (int i = 0; i < a.length(); i++) diff |= a.charAt(i) ^ b.charAt(i);
        return diff == 0;
    }
}
