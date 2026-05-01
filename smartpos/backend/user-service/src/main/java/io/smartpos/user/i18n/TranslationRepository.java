package io.smartpos.user.i18n;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TranslationRepository extends JpaRepository<Translation, UUID> {
    List<Translation> findByLanguageCodeIgnoreCase(String languageCode);
    Optional<Translation> findByLanguageCodeAndNamespaceAndKey(String code, String ns, String key);
}
