package io.smartpos.sales.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.sales.api.dto.DocumentThemeDto;
import io.smartpos.sales.domain.model.DocumentTheme;
import io.smartpos.sales.domain.repository.DocumentThemeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
@RequiredArgsConstructor
public class DocumentThemeService {

    private final DocumentThemeRepository repo;

    public List<DocumentThemeDto> list(UUID tenantId) {
        return repo.findByTenantIdOrderByDocTypeAsc(tenantId).stream()
            .map(DocumentThemeDto::from).toList();
    }

    @Transactional
    public List<DocumentThemeDto> saveAll(UUID tenantId, List<DocumentThemeDto> themes) {
        List<DocumentTheme> saved = new ArrayList<>();
        for (DocumentThemeDto dto : themes) {
            DocumentTheme existing = repo.findByTenantIdAndDocType(tenantId, dto.docType())
                .orElseGet(() -> DocumentTheme.builder()
                    .tenantId(tenantId)
                    .docType(dto.docType())
                    .build());
            existing.setPrimaryColor(dto.primaryColor());
            existing.setAccentColor(dto.accentColor());
            existing.setFontFamily(dto.fontFamily());
            existing.setHeaderStyle(dto.headerStyle() != null ? dto.headerStyle() : "solid");
            existing.setShowWatermark(dto.showWatermark());
            existing.setShowQrCode(dto.showQrCode());
            saved.add(repo.save(existing));
        }
        return saved.stream().map(DocumentThemeDto::from).toList();
    }

    @Transactional
    public void resetAll(UUID tenantId) {
        repo.deleteAll(repo.findByTenantIdOrderByDocTypeAsc(tenantId));
    }
}
