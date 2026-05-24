package io.smartpos.sales.api.dto;

import io.smartpos.sales.domain.model.DocumentTheme;
import java.util.UUID;

public record DocumentThemeDto(
    UUID id,
    String docType,
    String primaryColor,
    String accentColor,
    String fontFamily,
    String headerStyle,
    boolean showWatermark,
    boolean showQrCode
) {
    public static DocumentThemeDto from(DocumentTheme t) {
        return new DocumentThemeDto(t.getId(), t.getDocType(),
            t.getPrimaryColor(), t.getAccentColor(), t.getFontFamily(),
            t.getHeaderStyle(), t.isShowWatermark(), t.isShowQrCode());
    }
}
