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

    /**
     * Cascade brand colour / font changes to every existing DocumentTheme
     * row whose values currently match the previous brand values. This
     * preserves intentional per-document-type overrides — only rows that
     * were inheriting from brand get updated.
     */
    @Transactional
    public int cascadeBrandChange(UUID tenantId,
                                  String oldPrimary, String newPrimary,
                                  String oldAccent,  String newAccent,
                                  String oldFont,    String newFont) {
        int updated = 0;
        var themes = repo.findByTenantIdOrderByDocTypeAsc(tenantId);
        for (DocumentTheme t : themes) {
            boolean changed = false;
            if (sameOrBlank(t.getPrimaryColor(), oldPrimary) && newPrimary != null) {
                t.setPrimaryColor(newPrimary); changed = true;
            }
            if (sameOrBlank(t.getAccentColor(), oldAccent) && newAccent != null) {
                t.setAccentColor(newAccent); changed = true;
            }
            if (sameOrBlank(t.getFontFamily(), oldFont) && newFont != null) {
                t.setFontFamily(newFont); changed = true;
            }
            if (changed) { repo.save(t); updated++; }
        }
        return updated;
    }

    private boolean sameOrBlank(String themeValue, String brandValue) {
        if (themeValue == null || themeValue.isBlank()) return true; // inheriting
        return brandValue != null && themeValue.equalsIgnoreCase(brandValue);
    }
}
