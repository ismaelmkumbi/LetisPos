package io.smartpos.ai.application;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;

import java.nio.charset.StandardCharsets;
import java.util.*;

@Component
public class KnowledgeBase {

    private static final Logger log = LoggerFactory.getLogger(KnowledgeBase.class);

    private final WebClient http = WebClient.builder().build();
    private final ObjectMapper om = new ObjectMapper();

    @Value("${smartpos.ai.openai.api-key:${OPENAI_API_KEY:}}")
    private String openAiKey;

    @Value("${smartpos.ai.openai.base-url:${OPENAI_BASE_URL:https://api.openai.com/v1}}")
    private String openAiBaseUrl;

    private final List<Chunk> chunks = new ArrayList<>();

    record Chunk(String title, String category, String text, double[] embedding) {}

    @PostConstruct
    void init() {
        if (openAiKey == null || openAiKey.isBlank()) {
            log.warn("OPENAI_API_KEY not set — knowledge base embeddings disabled");
            return;
        }
        try {
            loadArticles();
            log.info("Knowledge base loaded: {} chunks", chunks.size());
        } catch (Exception e) {
            log.error("Failed to load knowledge base", e);
        }
    }

    private void loadArticles() throws Exception {
        var resolver = new PathMatchingResourcePatternResolver();
        Resource[] resources = resolver.getResources("classpath:knowledge/**/*.md");
        for (Resource res : resources) {
            String content = res.getContentAsString(StandardCharsets.UTF_8);
            parseAndChunk(res.getFilename(), content);
        }
    }

    private void parseAndChunk(String filename, String content) {
        // Parse YAML frontmatter (between --- markers)
        String title = filename;
        String category = "general";
        String body = content;

        if (content.startsWith("---")) {
            int end = content.indexOf("---", 3);
            if (end > 0) {
                String frontmatter = content.substring(3, end).trim();
                for (String line : frontmatter.split("\n")) {
                    String[] parts = line.split(":", 2);
                    if (parts.length == 2) {
                        String key = parts[0].trim();
                        String value = parts[1].trim();
                        if ("title".equals(key)) title = value;
                        if ("category".equals(key)) category = value;
                    }
                }
                body = content.substring(end + 3).trim();
            }
        }

        // Chunk by headings (split on ##)
        String[] sections = body.split("\n## ");
        for (int i = 0; i < sections.length; i++) {
            String section = (i > 0 ? "## " : "") + sections[i];
            if (section.trim().length() < 50) continue;
            double[] embedding = embed(section.trim());
            if (embedding != null) {
                chunks.add(new Chunk(title, category, section.trim(), embedding));
            }
        }
    }

    private double[] embed(String text) {
        if (openAiKey == null || openAiKey.isBlank()) return null;
        try {
            Map<String, Object> body = Map.of(
                "model", "text-embedding-3-small",
                "input", text
            );
            String resp = http.post()
                .uri(openAiBaseUrl + "/embeddings")
                .header("Authorization", "Bearer " + openAiKey)
                .header("Content-Type", "application/json")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(String.class)
                .block();
            if (resp == null) return null;
            JsonNode node = om.readTree(resp);
            JsonNode data = node.get("data");
            if (data != null && data.isArray() && data.size() > 0) {
                JsonNode emb = data.get(0).get("embedding");
                if (emb != null) {
                    double[] vec = new double[emb.size()];
                    for (int i = 0; i < emb.size(); i++) vec[i] = emb.get(i).asDouble();
                    return vec;
                }
            }
        } catch (Exception e) {
            log.debug("Embedding failed: {}", e.getMessage());
        }
        return null;
    }

    /**
     * Search knowledge base by semantic similarity.
     * Returns top 3 matching chunks, or empty list if embeddings unavailable.
     */
    public List<String> search(String query, String domain) {
        if (chunks.isEmpty()) return List.of();

        double[] queryVec = embed(query);
        if (queryVec == null) return List.of();
        String normalizedDomain = domain == null ? "" : domain.toLowerCase(Locale.ROOT);

        return chunks.stream()
            .map(c -> new Object() {
                final Chunk chunk = c;
                final double score = cosine(queryVec, c.embedding)
                    + (normalizedDomain.isBlank() || "general".equals(normalizedDomain)
                        || normalizedDomain.equals(c.category.toLowerCase(Locale.ROOT)) ? 0.05 : 0.0);
            })
            .filter(x -> x.score > 0.3)
            .sorted((a, b) -> Double.compare(b.score, a.score))
            .limit(3)
            .map(x -> "[" + x.chunk.title + "]\n" + x.chunk.text)
            .toList();
    }

    private double cosine(double[] a, double[] b) {
        double dot = 0, normA = 0, normB = 0;
        for (int i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        if (normA == 0 || normB == 0) return 0;
        return dot / (Math.sqrt(normA) * Math.sqrt(normB));
    }
}
