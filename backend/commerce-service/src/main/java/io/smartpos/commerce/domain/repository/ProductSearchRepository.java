package io.smartpos.commerce.domain.repository;

import io.smartpos.commerce.domain.model.PublishedProduct;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class ProductSearchRepository {

    @PersistenceContext
    private final EntityManager em;

    @SuppressWarnings("unchecked")
    public SearchResult search(UUID storeId, String query, int page, int size) {
        String sanitized = query.trim().replaceAll("[^\\w\\s]", "");
        if (sanitized.isEmpty()) return new SearchResult(List.of(), 0);

        String[] terms = sanitized.split("\\s+");
        StringBuilder tsquery = new StringBuilder();
        for (int i = 0; i < terms.length; i++) {
            if (i > 0) tsquery.append(" & ");
            tsquery.append(terms[i]).append(":*");
        }

        try {
            Query countQ = em.createNativeQuery("""
                SELECT count(*) FROM published_products
                WHERE store_id = :storeId
                AND deleted_at IS NULL
                AND search_vector @@ to_tsquery('english', :query)
                """);
            countQ.setParameter("storeId", storeId);
            countQ.setParameter("query", tsquery.toString());
            long total = ((Number) countQ.getSingleResult()).longValue();

            Query searchQ = em.createNativeQuery("""
                SELECT pp.*, ts_rank(pp.search_vector, to_tsquery('english', :query)) AS rank
                FROM published_products pp
                WHERE pp.store_id = :storeId
                AND pp.deleted_at IS NULL
                AND pp.search_vector @@ to_tsquery('english', :query)
                ORDER BY rank DESC
                LIMIT :limit OFFSET :offset
                """, PublishedProduct.class);
            searchQ.setParameter("storeId", storeId);
            searchQ.setParameter("query", tsquery.toString());
            searchQ.setParameter("limit", size);
            searchQ.setParameter("offset", page * size);

            List<PublishedProduct> results = searchQ.getResultList();
            return new SearchResult(results, total);
        } catch (Exception e) {
            return searchSimple(storeId, query, page, size);
        }
    }

    @SuppressWarnings("unchecked")
    public SearchResult searchSimple(UUID storeId, String query, int page, int size) {
        String pattern = "%" + query.trim().replace("%", "\\%") + "%";
        Query countQ = em.createNativeQuery("""
            SELECT count(*) FROM published_products
            WHERE store_id = :storeId
            AND deleted_at IS NULL
            AND (meta_title ILIKE :pattern OR meta_description ILIKE :pattern)
            """);
        countQ.setParameter("storeId", storeId);
        countQ.setParameter("pattern", pattern);
        long total = ((Number) countQ.getSingleResult()).longValue();

        Query searchQ = em.createNativeQuery("""
            SELECT pp.* FROM published_products pp
            WHERE pp.store_id = :storeId
            AND pp.deleted_at IS NULL
            AND (pp.meta_title ILIKE :pattern OR pp.meta_description ILIKE :pattern)
            ORDER BY pp.published_at DESC
            LIMIT :limit OFFSET :offset
            """, PublishedProduct.class);
        searchQ.setParameter("storeId", storeId);
        searchQ.setParameter("pattern", pattern);
        searchQ.setParameter("limit", size);
        searchQ.setParameter("offset", page * size);

        List<PublishedProduct> results = searchQ.getResultList();
        return new SearchResult(results, total);
    }

    public record SearchResult(List<PublishedProduct> products, long total) {}
}
