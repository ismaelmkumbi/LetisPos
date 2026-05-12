package io.smartpos.commerce.domain.repository;

import io.smartpos.commerce.domain.model.Theme;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ThemeRepository extends JpaRepository<Theme, UUID> {
    Optional<Theme> findByStoreId(UUID storeId);
}
