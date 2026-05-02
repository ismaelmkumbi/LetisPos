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

    @Query("""
           SELECT u FROM UserProfile u
           WHERE (:search IS NULL OR
                  LOWER(u.email)     LIKE LOWER(CONCAT('%', :search, '%')) OR
                  LOWER(u.firstName) LIKE LOWER(CONCAT('%', :search, '%')) OR
                  LOWER(u.lastName)  LIKE LOWER(CONCAT('%', :search, '%')))
             AND (:active IS NULL OR u.active = :active)
           """)
    Page<UserProfile> search(@Param("search") String search,
                             @Param("active") Boolean active,
                             Pageable pageable);
}
