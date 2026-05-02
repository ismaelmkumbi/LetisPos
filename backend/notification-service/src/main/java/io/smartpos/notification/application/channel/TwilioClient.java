package io.smartpos.notification.application.channel;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.Map;

/**
 * Thin wrapper around Twilio's HTTPS Messages endpoint.
 * Both SMS and WhatsApp dispatchers POST the same form-encoded body —
 * the only difference is the {@code From} prefix ("whatsapp:" for WA).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TwilioClient {

    private static final String BASE = "https://api.twilio.com/2010-04-01";
    private final TwilioProperties props;
    private final WebClient webClient = WebClient.builder().build();

    /**
     * Returns the Twilio message SID on success; throws on any non-2xx.
     */
    public String send(String from, String to, String body) {
        if (props.accountSid() == null || props.accountSid().isBlank()) {
            throw new IllegalStateException("Twilio not configured (smartpos.notification.twilio.account-sid missing)");
        }
        String url = BASE + "/Accounts/" + props.accountSid() + "/Messages.json";
        String basic = Base64.getEncoder().encodeToString(
                (props.accountSid() + ":" + props.authToken()).getBytes(StandardCharsets.UTF_8));

        MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("From", from);
        form.add("To",   to);
        form.add("Body", body);

        // Twilio responds with a JSON object containing a "sid" field on success.
        @SuppressWarnings("unchecked")
        Map<String, Object> resp = webClient.post()
                .uri(url)
                .header(HttpHeaders.AUTHORIZATION, "Basic " + basic)
                .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                .body(BodyInserters.fromFormData(form))
                .retrieve()
                .bodyToMono(Map.class)
                .timeout(Duration.ofSeconds(15))
                .block();

        if (resp == null || resp.get("sid") == null) {
            throw new IllegalStateException("Twilio returned no SID: " + resp);
        }
        return resp.get("sid").toString();
    }
}
