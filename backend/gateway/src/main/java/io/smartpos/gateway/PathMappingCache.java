package io.smartpos.gateway;

import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

@Component
public class PathMappingCache {

    private final WebClient webClient;
    private final List<PathMapping> mappings = new CopyOnWriteArrayList<>();

    public PathMappingCache(@Value("${user-service.url:http://user-service:8080}") String userServiceUrl,
                            @Value("${internal.token:}") String internalToken) {
        this.webClient = WebClient.builder()
            .baseUrl(userServiceUrl)
            .defaultHeader("X-Internal-Token", internalToken)
            .build();
    }

    @PostConstruct
    void init() {
        refresh();
    }

    @Scheduled(fixedRate = 300_000)
    public void refresh() {
        try {
            List<PathMapping> fetched = webClient.get()
                .uri("/api/internal/features/path-mappings")
                .retrieve()
                .bodyToFlux(PathMapping.class)
                .collectList()
                .block();
            if (fetched != null) {
                mappings.clear();
                mappings.addAll(fetched);
            }
        } catch (Exception e) {
            // Logging omitted — no Lombok @Slf4j; failures are silent with fallback to cached data
        }
    }

    public List<PathMapping> getMappings() {
        return List.copyOf(mappings);
    }

    public static class PathMapping {
        private String pathPattern;
        private String requiredFeatureKey;
        private int httpStatusOnDeny = 402;
        private int sortOrder;

        public String getPathPattern() { return pathPattern; }
        public void setPathPattern(String pathPattern) { this.pathPattern = pathPattern; }

        public String getRequiredFeatureKey() { return requiredFeatureKey; }
        public void setRequiredFeatureKey(String requiredFeatureKey) { this.requiredFeatureKey = requiredFeatureKey; }

        public int getHttpStatusOnDeny() { return httpStatusOnDeny; }
        public void setHttpStatusOnDeny(int httpStatusOnDeny) { this.httpStatusOnDeny = httpStatusOnDeny; }

        public int getSortOrder() { return sortOrder; }
        public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
    }
}
