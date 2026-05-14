package io.smartpos.user.domain.repository;

import io.smartpos.user.domain.model.UserProfile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface UserProfileRepository extends JpaRepository<UserProfile, UUID> {
    Optional<UserProfile> findByEmailIgnoreCase(String email);

    long countByTenantId(UUID tenantId);

    @Query("""
           SELECT u FROM UserProfile u
           WHERE u.tenantId = :tenantId
             AND (:search IS NULL OR
                  u.email           LIKE CONCAT('%', :search, '%') OR
                  LOWER(u.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR
                  LOWER(u.lastName)  LIKE LOWER(CONCAT('%', :search, '%')))
             AND (:active IS NULL OR u.active = :active)
           """)
    Page<UserProfile> search(@Param("search") String search,
                             @Param("active") Boolean active,
                             @Param("tenantId") UUID tenantId,
                             Pageable pageable);

    @Query(value = """
           SELECT * FROM user_profiles u
           WHERE (:search IS NULL OR
                  u.email           LIKE CONCAT('%', CAST(:search AS text), '%') OR
                  LOWER(u.first_name) LIKE LOWER(CONCAT('%', CAST(:search AS text), '%')) OR
                  LOWER(u.last_name)  LIKE LOWER(CONCAT('%', CAST(:search AS text), '%')))
             AND (:active IS NULL OR u.is_active = :active)
           """, nativeQuery = true)
    Page<UserProfile> searchAll(@Param("search") String search,
                                @Param("active") Boolean active,
                                Pageable pageable);
}
