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
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

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
    private final Map<String, double[]> embeddingCache = new ConcurrentHashMap<>();
    private final AtomicLong searches = new AtomicLong();
    private final AtomicLong hits = new AtomicLong();
    private final AtomicLong embeddingCalls = new AtomicLong();

    record Chunk(String title, String category, String text, double[] embedding) {}

    @PostConstruct
    void init() {
        boolean embeddingsAvailable = openAiKey != null && !openAiKey.isBlank();
        if (!embeddingsAvailable) {
            log.warn("OPENAI_API_KEY not set — knowledge base running in lexical (BM25-lite) mode");
        }
        try {
            loadArticles();
            log.info("Knowledge base loaded: {} chunks ({})",
                chunks.size(), embeddingsAvailable ? "embeddings" : "lexical");
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
            // Keep the chunk either way — lexical search still works without
            // embeddings, so the assistant can answer how-to questions in
            // dev/offline environments.
            chunks.add(new Chunk(title, category, section.trim(), embedding));
        }
    }

    private double[] embed(String text) {
        if (openAiKey == null || openAiKey.isBlank()) return null;
        String key = Integer.toHexString(Objects.hash(text));
        if (embeddingCache.containsKey(key)) return embeddingCache.get(key);
        try {
            embeddingCalls.incrementAndGet();
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
                    embeddingCache.put(key, vec);
                    return vec;
                }
            }
        } catch (Exception e) {
            log.debug("Embedding failed: {}", e.getMessage());
        }
        return null;
    }

    /**
     * Search knowledge base for the top 3 matching chunks.
     * Uses semantic similarity when embeddings are available, otherwise
     * falls back to a BM25-lite lexical score so guides still work in
     * offline / no-API-key environments.
     */
    public List<String> search(String query, String domain) {
        searches.incrementAndGet();
        if (chunks.isEmpty() || query == null || query.isBlank()) return List.of();
        String normalizedDomain = domain == null ? "" : domain.toLowerCase(Locale.ROOT);

        double[] queryVec = embed(query);
        boolean useEmbeddings = queryVec != null
            && chunks.stream().anyMatch(c -> c.embedding != null);

        if (useEmbeddings) {
            final double[] qv = queryVec;
            List<String> results = chunks.stream()
                .filter(c -> c.embedding != null)
                .map(c -> new Scored(c, cosine(qv, c.embedding)
                    + categoryBonus(c, normalizedDomain)))
                .filter(x -> x.score > 0.3)
                .sorted((a, b) -> Double.compare(b.score, a.score))
                .limit(3)
                .map(x -> "[" + x.chunk.title + "]\n" + x.chunk.text)
                .toList();
            if (!results.isEmpty()) hits.incrementAndGet();
            return results;
        }

        // Lexical fallback (BM25-lite)
        List<String> terms = tokenize(query);
        if (terms.isEmpty()) return List.of();
        List<String> results = chunks.stream()
            .map(c -> new Scored(c, lexicalScore(terms, c.text)
                + categoryBonus(c, normalizedDomain) * 10))
            .filter(x -> x.score > 0.5)
            .sorted((a, b) -> Double.compare(b.score, a.score))
            .limit(3)
            .map(x -> "[" + x.chunk.title + "]\n" + x.chunk.text)
            .toList();
        if (!results.isEmpty()) hits.incrementAndGet();
        return results;
    }

    public Map<String, Object> stats() {
        long s = searches.get();
        return Map.of(
            "chunks", chunks.size(),
            "searches", s,
            "hits", hits.get(),
            "hitRate", s == 0 ? 0.0 : (double) hits.get() / s,
            "embeddingCalls", embeddingCalls.get(),
            "embeddingCacheSize", embeddingCache.size()
        );
    }

    private record Scored(Chunk chunk, double score) {}

    private double categoryBonus(Chunk c, String normalizedDomain) {
        if (normalizedDomain.isBlank() || "general".equals(normalizedDomain)) return 0.05;
        return normalizedDomain.equals(c.category.toLowerCase(Locale.ROOT)) ? 0.05 : 0.0;
    }

    private List<String> tokenize(String s) {
        String lower = s.toLowerCase(Locale.ROOT);
        return java.util.Arrays.stream(lower.split("[^a-z0-9]+"))
            .filter(t -> t.length() > 2)
            .filter(t -> !STOPWORDS.contains(t))
            .toList();
    }

    private double lexicalScore(List<String> terms, String text) {
        String lower = text.toLowerCase(Locale.ROOT);
        double score = 0;
        for (String t : terms) {
            int hits = 0;
            int idx = 0;
            while ((idx = lower.indexOf(t, idx)) >= 0) {
                hits++;
                idx += t.length();
            }
            if (hits > 0) {
                score += Math.log(1 + hits) + (t.length() >= 5 ? 0.3 : 0);
            }
        }
        return score;
    }

    private static final java.util.Set<String> STOPWORDS = java.util.Set.of(
        "the","and","for","with","how","you","are","this","that","what",
        "can","does","when","where","why","from","into","onto","but","not"
    );

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
