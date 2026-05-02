package io.smartpos.user.i18n;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LanguageRepository extends JpaRepository<Language, UUID> {
    Optional<Language> findByCodeIgnoreCase(String code);
    boolean existsByCodeIgnoreCase(String code);
    List<Language> findByEnabledTrueOrderByCodeAsc();
}
