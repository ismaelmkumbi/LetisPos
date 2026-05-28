package io.smartpos.auth.infrastructure.whatsapp;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Sends WhatsApp text messages via the Meta Cloud API (v22.0).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MetaWhatsAppClient {

    private static final String BASE_URL = "https://graph.facebook.com/v22.0";
    private final MetaWhatsAppProperties props;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    public String send(String to, String body) {
        if (props.accessToken() == null || props.accessToken().isBlank()) {
            throw new IllegalStateException(
                "Meta WhatsApp not configured (smartpos.verification.whatsapp.access-token missing)");
        }

        String recipient = to.replaceAll("[\\s\\-()]", "");
        if (!recipient.startsWith("+")) {
            recipient = "+" + recipient;
        }

        String url = BASE_URL + "/" + props.phoneNumberId() + "/messages";

        try {
            String json = objectMapper.writeValueAsString(Map.of(
                "messaging_product", "whatsapp",
                "recipient_type", "individual",
                "to", recipient,
                "type", "text",
                "text", Map.of("preview_url", false, "body", body)
            ));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", "Bearer " + props.accessToken())
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .timeout(Duration.ofSeconds(10))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() >= 400) {
                throw new IllegalStateException("Meta WhatsApp API error HTTP " + response.statusCode()
                        + ": " + response.body());
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> respMap = objectMapper.readValue(response.body(), Map.class);
            String waId = "sent";
            if (respMap.get("messages") instanceof List<?> messages && !messages.isEmpty()) {
                if (messages.get(0) instanceof Map<?, ?> msg) {
                    waId = String.valueOf(msg.get("id"));
                }
            }
            log.info("WhatsApp message sent to {} (wa_id={})", recipient, waId);
            return waId;
        } catch (Exception e) {
            throw new IllegalStateException("Meta WhatsApp send failed: " + e.getMessage(), e);
        }
    }
}
