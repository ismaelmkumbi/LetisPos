package io.smartpos.documents.infrastructure.gotenberg;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

@Slf4j
@Component
public class GotenbergClient {

    private final String gotenbergUrl;
    private final HttpClient httpClient;

    public GotenbergClient(
            @Value("${smartpos.gotenberg.url:http://localhost:3000}") String gotenbergUrl,
            @Value("${smartpos.gotenberg.request-timeout-seconds:30}") int timeoutSeconds) {
        this.gotenbergUrl = gotenbergUrl;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(timeoutSeconds))
                .build();
    }

    public byte[] convertHtmlToPdf(String html) throws IOException, InterruptedException {
        String boundary = "----GotenbergFormBoundary" + System.currentTimeMillis();
        String body = buildMultipartBody(html, boundary);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(gotenbergUrl + "/forms/chromium/convert/html"))
                .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                .timeout(Duration.ofSeconds(30))
                .POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
                .build();

        log.debug("Sending HTML to Gotenberg, size={} bytes", html.length());
        HttpResponse<byte[]> response = httpClient.send(request,
                HttpResponse.BodyHandlers.ofByteArray());

        if (response.statusCode() != 200) {
            String errBody = response.body() != null
                    ? new String(response.body(), StandardCharsets.UTF_8) : "no body";
            log.error("Gotenberg returned {}: {}", response.statusCode(), errBody);
            throw new IOException("Gotenberg conversion failed: HTTP " + response.statusCode());
        }

        log.debug("Got PDF from Gotenberg, size={} bytes", response.body().length);
        return response.body();
    }

    private String buildMultipartBody(String html, String boundary) {
        StringBuilder sb = new StringBuilder();
        sb.append("--").append(boundary).append("\r\n");
        sb.append("Content-Disposition: form-data; name=\"files\"; filename=\"index.html\"\r\n");
        sb.append("Content-Type: text/html\r\n\r\n");
        sb.append(html).append("\r\n");
        sb.append("--").append(boundary).append("\r\n");
        sb.append("Content-Disposition: form-data; name=\"paperWidth\"\r\n\r\n");
        sb.append("8.27\r\n");
        sb.append("--").append(boundary).append("\r\n");
        sb.append("Content-Disposition: form-data; name=\"paperHeight\"\r\n\r\n");
        sb.append("11.69\r\n");
        sb.append("--").append(boundary).append("\r\n");
        sb.append("Content-Disposition: form-data; name=\"marginTop\"\r\n\r\n");
        sb.append("0.59\r\n");
        sb.append("--").append(boundary).append("\r\n");
        sb.append("Content-Disposition: form-data; name=\"marginBottom\"\r\n\r\n");
        sb.append("0.59\r\n");
        sb.append("--").append(boundary).append("\r\n");
        sb.append("Content-Disposition: form-data; name=\"marginLeft\"\r\n\r\n");
        sb.append("0.59\r\n");
        sb.append("--").append(boundary).append("\r\n");
        sb.append("Content-Disposition: form-data; name=\"marginRight\"\r\n\r\n");
        sb.append("0.59\r\n");
        sb.append("--").append(boundary).append("--\r\n");
        return sb.toString();
    }
}
