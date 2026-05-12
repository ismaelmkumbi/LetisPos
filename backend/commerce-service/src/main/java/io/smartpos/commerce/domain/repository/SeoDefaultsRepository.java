package io.smartpos.commerce.domain.repository;

import io.smartpos.commerce.domain.model.SeoDefaults;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SeoDefaultsRepository extends JpaRepository<SeoDefaults, UUID> {
    Optional<SeoDefaults> findByStoreId(UUID storeId);
}
