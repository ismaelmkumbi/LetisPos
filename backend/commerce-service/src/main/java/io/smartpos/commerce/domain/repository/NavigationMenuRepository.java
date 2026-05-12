package io.smartpos.commerce.domain.repository;

import io.smartpos.commerce.domain.model.NavigationMenu;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface NavigationMenuRepository extends JpaRepository<NavigationMenu, UUID> {
    Optional<NavigationMenu> findByStoreIdAndLocation(UUID storeId, String location);
}
