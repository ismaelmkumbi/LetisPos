package io.smartpos.ai.application;

import io.minio.*;
import io.smartpos.ai.api.dto.CaptureSessionDtos.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
@RequiredArgsConstructor
@Slf4j
public class CaptureSessionService {

    private final MinioClient minio;

    @Value("${app.capture.base-url:http://localhost:5173}")
    private String baseUrl;

    @Value("${app.capture.bucket:capture-sessions}")
    private String bucket;

    private static final int MAX_PHOTOS = 20;
    private static final long SESSION_TTL_MINUTES = 10;
    /** Cleanup TTL — expired sessions get their MinIO objects deleted after this many hours. */
    private static final long CLEANUP_TTL_HOURS = 1;

    private final Map<UUID, SessionState> sessions = new ConcurrentHashMap<>();
    private final SecureRandom secureRandom = new SecureRandom();

    private record SessionState(
            Instant createdAt,
            String uploadToken,
            List<PhotoInfo> photos,
            boolean complete
    ) {}

    public CreateSessionResponse createSession() {
        UUID sessionId = UUID.randomUUID();
        Instant now = Instant.now();
        String uploadToken = newToken();
        sessions.put(sessionId, new SessionState(now, uploadToken, new CopyOnWriteArrayList<>(), false));
        // Embed the upload token in the QR URL so the phone (which has no JWT)
        // can authenticate itself to the capture-only endpoints. The token is
        // session-scoped, single-purpose, and expires with the session.
        String qrUrl = baseUrl + "/capture/" + sessionId + "?t=" + uploadToken;
        Instant expiresAt = now.plusSeconds(SESSION_TTL_MINUTES * 60);
        ensureBucket();
        return new CreateSessionResponse(sessionId, qrUrl, uploadToken, expiresAt);
    }

    /** Reject anything that doesn't present the session's bound upload token. */
    public void verifyUploadToken(UUID sessionId, String presentedToken) {
        SessionState state = getSessionOrThrow(sessionId);
        if (presentedToken == null || presentedToken.isBlank()
                || !MessageDigestSafeEquals.equals(state.uploadToken(), presentedToken)) {
            throw new SecurityException("Invalid or missing capture token");
        }
    }

    private String newToken() {
        byte[] bytes = new byte[24];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    /** Constant-time string comparison so token validation can't be timed. */
    private static final class MessageDigestSafeEquals {
        static boolean equals(String a, String b) {
            if (a == null || b == null) return false;
            byte[] x = a.getBytes();
            byte[] y = b.getBytes();
            if (x.length != y.length) return false;
            int diff = 0;
            for (int i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
            return diff == 0;
        }
    }

    public PhotoUploadResponse uploadPhoto(UUID sessionId, MultipartFile file) {
        SessionState state = getSessionOrThrow(sessionId);
        checkNotExpired(state);
        if (state.complete()) throw new IllegalStateException("Session already complete");
        if (state.photos().size() >= MAX_PHOTOS) throw new IllegalStateException("Max photos reached");
        if (file.getSize() > 10_485_760) throw new IllegalArgumentException("Photo exceeds 10MB limit");

        try (InputStream inputStream = file.getInputStream()) {
            int index = state.photos().size();
            String objectName = sessionId + "/" + index + ".jpg";
            minio.putObject(PutObjectArgs.builder()
                    .bucket(bucket)
                    .object(objectName)
                    .stream(inputStream, file.getSize(), -1)
                    .contentType("image/jpeg")
                    .build());

            String fullUrl = "/api/v1/ai/capture-sessions/" + sessionId + "/photos/" + index + "/full";
            String thumbUrl = "/api/v1/ai/capture-sessions/" + sessionId + "/photos/" + index + "/thumb";
            UUID photoId = UUID.randomUUID();
            PhotoInfo info = new PhotoInfo(photoId, index, thumbUrl, fullUrl);
            state.photos().add(info);
            return new PhotoUploadResponse(photoId, index, thumbUrl);
        } catch (IllegalArgumentException | IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to upload photo for session {}", sessionId, e);
            throw new RuntimeException("Upload failed", e);
        }
    }

    public SessionPhotosResponse getPhotos(UUID sessionId) {
        SessionState state = getSessionOrThrow(sessionId);
        checkNotExpired(state);
        return new SessionPhotosResponse(
                sessionId,
                List.copyOf(state.photos()),
                state.complete(),
                state.photos().size()
        );
    }

    public CompleteResponse completeSession(UUID sessionId) {
        SessionState state = getSessionOrThrow(sessionId);
        checkNotExpired(state);
        sessions.put(sessionId, new SessionState(state.createdAt(), state.uploadToken(), state.photos(), true));
        return new CompleteResponse(sessionId, state.photos().size(), true);
    }

    public void deleteSession(UUID sessionId) {
        sessions.remove(sessionId);
        try {
            var objects = minio.listObjects(ListObjectsArgs.builder()
                    .bucket(bucket).prefix(sessionId.toString() + "/").build());
            for (var result : objects) {
                try {
                    String name = result.get().objectName();
                    minio.removeObject(RemoveObjectArgs.builder()
                            .bucket(bucket).object(name).build());
                } catch (Exception e) {
                    log.warn("Failed to delete individual object for session {}", sessionId, e);
                }
            }
        } catch (Exception e) {
            log.warn("Failed to list MinIO objects for session {}", sessionId, e);
        }
    }

    public InputStream getPhotoStream(UUID sessionId, int index) {
        SessionState state = getSessionOrThrow(sessionId);
        checkNotExpired(state);
        try {
            return minio.getObject(GetObjectArgs.builder()
                    .bucket(bucket)
                    .object(sessionId + "/" + index + ".jpg")
                    .build());
        } catch (Exception e) {
            throw new RuntimeException("Photo not found", e);
        }
    }

    @Scheduled(fixedRate = 300_000)
    public void cleanupExpired() {
        Instant cutoff = Instant.now().minusSeconds(CLEANUP_TTL_HOURS * 3600);
        sessions.entrySet().removeIf(entry -> {
            if (entry.getValue().createdAt().isBefore(cutoff)) {
                deleteSession(entry.getKey());
                return true;
            }
            return false;
        });
    }

    private void checkNotExpired(SessionState state) {
        if (state.createdAt().plusSeconds(SESSION_TTL_MINUTES * 60).isBefore(Instant.now())) {
            throw new IllegalStateException("Session expired");
        }
    }

    private SessionState getSessionOrThrow(UUID sessionId) {
        SessionState state = sessions.get(sessionId);
        if (state == null) throw new NoSuchElementException("Session not found");
        return state;
    }

    private void ensureBucket() {
        try {
            boolean exists = minio.bucketExists(BucketExistsArgs.builder().bucket(bucket).build());
            if (!exists) minio.makeBucket(MakeBucketArgs.builder().bucket(bucket).build());
        } catch (Exception e) {
            log.warn("Could not ensure bucket exists: {}", e.getMessage());
        }
    }
}
