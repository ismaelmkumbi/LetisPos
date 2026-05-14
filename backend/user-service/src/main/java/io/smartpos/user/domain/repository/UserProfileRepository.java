package io.smartpos.user.domain.repository;

import io.smartpos.user.domain.model.UserProfile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;
import java.util.UUID;

public interface UserProfileRepository extends JpaRepository<UserProfile, UUID>,
                                               JpaSpecificationExecutor<UserProfile> {
    Optional<UserProfile> findByEmailIgnoreCase(String email);

    long countByTenantId(UUID tenantId);

    static Specification<UserProfile> searchSpec(String search, Boolean active, UUID tenantId) {
        Specification<UserProfile> spec = Specification.where(null);
        if (tenantId != null) {
            spec = spec.and((root, query, cb) ->
                    cb.equal(root.get("tenantId"), tenantId));
        }
        if (search != null && !search.isBlank()) {
            String pattern = "%" + search.toLowerCase() + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(root.get("email"), pattern),
                    cb.like(cb.lower(root.get("firstName")), pattern),
                    cb.like(cb.lower(root.get("lastName")), pattern)
            ));
        }
        if (active != null) {
            spec = spec.and((root, query, cb) ->
                    cb.equal(root.get("active"), active));
        }
        return spec;
    }
}
