package io.smartpos.ai.api.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class CaptureSessionDtos {

    private CaptureSessionDtos() {}

    public record CreateSessionResponse(
            UUID sessionId,
            String qrUrl,
            Instant expiresAt
    ) {}

    public record PhotoUploadResponse(
            UUID photoId,
            int index,
            String thumbnailUrl
    ) {}

    public record PhotoInfo(
            UUID photoId,
            int index,
            String thumbnailUrl,
            String fullUrl
    ) {}

    public record SessionPhotosResponse(
            UUID sessionId,
            List<PhotoInfo> photos,
            boolean complete,
            int photoCount
    ) {}

    public record CompleteResponse(
            UUID sessionId,
            int photoCount,
            boolean complete
    ) {}
}
