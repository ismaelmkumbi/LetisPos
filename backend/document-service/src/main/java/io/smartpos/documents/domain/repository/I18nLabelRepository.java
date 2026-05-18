package io.smartpos.documents.domain.repository;

import io.smartpos.documents.domain.model.I18nLabel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface I18nLabelRepository extends JpaRepository<I18nLabel, UUID> {

    @Query("""
        SELECT l FROM I18nLabel l
        WHERE l.locale = :locale
          AND (l.tenantId = :tenantId OR l.tenantId IS NULL)
        ORDER BY l.tenantId DESC NULLS LAST
        """)
    List<I18nLabel> findByLocaleWithFallback(@Param("locale") String locale,
                                              @Param("tenantId") UUID tenantId);
}
