package io.smartpos.commerce.domain.repository;

import io.smartpos.commerce.domain.model.CustomDomain;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CustomDomainRepository extends JpaRepository<CustomDomain, UUID> {
    List<CustomDomain> findByStoreId(UUID storeId);
    Optional<CustomDomain> findByDomain(String domain);
}
