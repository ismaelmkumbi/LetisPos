package io.smartpos.billing.infrastructure.payment;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.http.MediaType;
import org.springframework.http.HttpHeaders;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * M-Pesa Daraja API client.
 * Authenticates with OAuth, sends STK push requests, and queries payment status.
 */
@Slf4j
@Service
public class MpesaClient {

    private final DarajaProperties props;
    private final WebClient webClient;

    private String accessToken;
    private Instant tokenExpiry;

    public MpesaClient(DarajaProperties props) {
        this.props = props;
        this.webClient = WebClient.builder().build();
    }

    /**
     * Returns a valid access token, refreshing if expired.
     */
    private synchronized String getAccessToken() {
        if (accessToken != null && tokenExpiry != null && Instant.now().isBefore(tokenExpiry)) {
            return accessToken;
        }

        String credentials = props.consumerKey() + ":" + props.consumerSecret();
        String encoded = Base64.getEncoder()
                .encodeToString(credentials.getBytes(StandardCharsets.UTF_8));

        Map<String, Object> response = webClient.get()
                .uri(props.authUrl())
                .header(HttpHeaders.AUTHORIZATION, "Basic " + encoded)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        if (response == null || response.get("access_token") == null) {
            throw new RuntimeException("Failed to authenticate with Daraja API");
        }

        this.accessToken = (String) response.get("access_token");
        // Expire a minute early to be safe
        String expiresIn = String.valueOf(response.get("expires_in"));
        long seconds = Long.parseLong(expiresIn) - 60;
        if (seconds < 0) seconds = 0;
        this.tokenExpiry = Instant.now().plusSeconds(seconds);

        log.info("Daraja OAuth token obtained, expires in {}s", seconds);
        return this.accessToken;
    }

    /**
     * Initiates an STK push (M-Pesa payment prompt on customer phone).
     *
     * @param phoneNumber     phone in format 2547XXXXXXXX
     * @param amount          amount as string (e.g. "500")
     * @param accountReference reference shown in M-Pesa message
     * @param transactionDesc  description of the transaction
     * @return map with MerchantRequestID and CheckoutRequestID
     */
    public Map<String, Object> stkPush(String phoneNumber, String amount,
                                        String accountReference, String transactionDesc) {
        String timestamp = getTimestamp();
        String password = Base64.getEncoder().encodeToString(
                (props.shortcode() + props.passkey() + timestamp)
                        .getBytes(StandardCharsets.UTF_8));

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("BusinessShortCode", props.shortcode());
        body.put("Password", password);
        body.put("Timestamp", timestamp);
        body.put("TransactionType", "CustomerPayBillOnline");
        body.put("Amount", amount);
        body.put("PartyA", phoneNumber);
        body.put("PartyB", props.shortcode());
        body.put("PhoneNumber", phoneNumber);
        body.put("CallBackURL", "");  // placeholder — actual callback configured via the /callback endpoint
        body.put("AccountReference", accountReference);
        body.put("TransactionDesc", transactionDesc);

        String token = getAccessToken();

        Map<String, Object> response = webClient.post()
                .uri(props.stkPushUrl())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        log.info("STK push response: {}", response);
        return response;
    }

    /**
     * Queries the status of an STK push request.
     *
     * @param checkoutRequestId the CheckoutRequestID from the stkPush response
     * @return map containing ResultCode (0 = success) and other fields
     */
    public Map<String, Object> queryStatus(String checkoutRequestId) {
        String timestamp = getTimestamp();
        String password = Base64.getEncoder().encodeToString(
                (props.shortcode() + props.passkey() + timestamp)
                        .getBytes(StandardCharsets.UTF_8));

        Map<String, Object> body = Map.of(
            "BusinessShortCode", props.shortcode(),
            "Password", password,
            "Timestamp", timestamp,
            "CheckoutRequestID", checkoutRequestId
        );

        String token = getAccessToken();

        Map<String, Object> response = webClient.post()
                .uri(props.queryUrl())
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(body)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        log.info("STK query response: {}", response);
        return response;
    }

    /**
     * Generates a timestamp in the format expected by Safaricom (yyyyMMddHHmmss).
     */
    private static String getTimestamp() {
        return java.time.format.DateTimeFormatter.ofPattern("yyyyMMddHHmmss")
                .format(java.time.LocalDateTime.now(java.time.ZoneOffset.UTC));
    }
}
