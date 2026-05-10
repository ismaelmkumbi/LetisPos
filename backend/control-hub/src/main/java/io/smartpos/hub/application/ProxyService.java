package io.smartpos.hub.application;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.server.ResponseStatusException;

@Service
@Slf4j
public class ProxyService {
    private final WebClient client = WebClient.create();

    public String proxyAction(String host, int port, String action) {
        String uri = String.format("http://%s:%d/services/%s", host, port, action);
        try {
            String result = client.post()
                .uri(uri)
                .retrieve()
                .bodyToMono(String.class)
                .block();
            log.info("Proxy {} -> {}: OK", action, uri);
            return result;
        } catch (Exception e) {
            log.error("Proxy {} -> {}: FAILED — {}", action, uri, e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                "Agent unreachable: " + e.getMessage());
        }
    }

    public String proxyGet(String host, int port, String path) {
        String uri = String.format("http://%s:%d%s", host, port, path);
        try {
            return client.get()
                .uri(uri)
                .retrieve()
                .bodyToMono(String.class)
                .block();
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                "Agent GET proxy failed: " + e.getMessage());
        }
    }

    public String proxyLogs(String host, int port, String service, int tail, String filter, boolean grep) {
        String uri = String.format("http://%s:%d/logs/%s?tail=%d", host, port, service, tail);
        if (filter != null && !filter.isEmpty()) uri += "&filter=" + filter;
        if (grep) uri += "&grep=1";
        try {
            return client.get()
                .uri(uri)
                .retrieve()
                .bodyToMono(String.class)
                .block();
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                "Agent log proxy failed: " + e.getMessage());
        }
    }
}
