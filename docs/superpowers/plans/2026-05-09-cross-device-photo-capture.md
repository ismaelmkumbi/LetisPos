# Cross-Device Photo Capture — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace desktop webcam photo capture with cross-device QR code bridge: desktop shows QR → phone scans → phone camera captures product photos → photos flow back to Smart Import review step.

**Architecture:** Spring Boot backend (ai-service) provides session CRUD with MinIO photo storage. Frontend adds three pieces: a desktop `QrOverlay` component that polls for photos, a standalone `CameraPage` served at `/capture/:sessionId` for the phone browser, and a `CaptureSessionApi` client. Existing `ProductsImportDialog` gains a "Phone Camera" button wired to the overlay.

**Tech Stack:** Spring Boot (Java), React + MUI, qrcode.js (client-side QR), `getUserMedia()` API (phone camera), MinIO (photo storage)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `backend/ai-service/.../api/dto/CaptureSessionDtos.java` | Create | Request/response DTOs |
| `backend/ai-service/.../application/CaptureSessionService.java` | Create | Business logic, MinIO uploads, cleanup |
| `backend/ai-service/.../api/CaptureSessionController.java` | Create | REST endpoints |
| `backend/ai-service/.../infrastructure/minio/MinioConfig.java` | Check | MinIO client (may already exist) |
| `backend/ai-service/pom.xml` | Modify | Add MinIO SDK + qrcode deps if missing |
| `frontend/src/api/smartpos/captureSession.ts` | Create | API client for session + photo endpoints |
| `frontend/src/views/pages/capture/CameraPage.tsx` | Create | Phone camera page at `/capture/:sessionId` |
| `frontend/src/views/smartpos/products/QrOverlay.tsx` | Create | Desktop QR code + polling overlay |
| `frontend/src/routes/Router.tsx` | Modify | Add `/capture/:sessionId` route |
| `frontend/src/views/smartpos/products/ProductsImportDialog.tsx` | Modify | Add "Phone Camera" button + QrOverlay integration |
| `frontend/package.json` | Modify | Add `qrcode` dependency |

---

### Task 1: Backend DTOs for Capture Session

**Files:**
- Create: `backend/ai-service/src/main/java/io/smartpos/ai/api/dto/CaptureSessionDtos.java`

- [ ] **Step 1: Create CaptureSessionDtos.java**

```java
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
```

- [ ] **Step 2: Verify compilation**

Run: `cd backend/ai-service && mvn compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
git add backend/ai-service/src/main/java/io/smartpos/ai/api/dto/CaptureSessionDtos.java
git commit -m "feat: add capture session DTOs"
```

---

### Task 2: Backend Service — CaptureSessionService

**Files:**
- Create: `backend/ai-service/src/main/java/io/smartpos/ai/application/CaptureSessionService.java`

- [ ] **Step 1: Create CaptureSessionService.java**

```java
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
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

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
    private static final long STORAGE_TTL_HOURS = 1;

    // In-memory session state. Production would use Redis.
    private final Map<UUID, SessionState> sessions = new ConcurrentHashMap<>();

    private record SessionState(
            Instant createdAt,
            List<PhotoInfo> photos,
            boolean complete
    ) {}

    public CreateSessionResponse createSession() {
        UUID sessionId = UUID.randomUUID();
        Instant now = Instant.now();
        sessions.put(sessionId, new SessionState(now, new ArrayList<>(), false));
        String qrUrl = baseUrl + "/capture/" + sessionId;
        Instant expiresAt = now.plusSeconds(SESSION_TTL_MINUTES * 60);
        ensureBucket();
        return new CreateSessionResponse(sessionId, qrUrl, expiresAt);
    }

    public PhotoUploadResponse uploadPhoto(UUID sessionId, MultipartFile file) {
        SessionState state = getSessionOrThrow(sessionId);
        if (state.complete()) throw new IllegalStateException("Session already complete");
        if (state.photos().size() >= MAX_PHOTOS) throw new IllegalStateException("Max photos reached");

        try {
            int index = state.photos().size();
            String objectName = sessionId + "/" + index + ".jpg";
            minio.putObject(PutObjectArgs.builder()
                    .bucket(bucket)
                    .object(objectName)
                    .stream(file.getInputStream(), file.getSize(), -1)
                    .contentType("image/jpeg")
                    .build());

            String fullUrl = "/api/v1/ai/capture-sessions/" + sessionId + "/photos/" + index + "/full";
            String thumbUrl = "/api/v1/ai/capture-sessions/" + sessionId + "/photos/" + index + "/thumb";
            UUID photoId = UUID.randomUUID();
            PhotoInfo info = new PhotoInfo(photoId, index, thumbUrl, fullUrl);
            state.photos().add(info);
            return new PhotoUploadResponse(photoId, index, thumbUrl);
        } catch (Exception e) {
            log.error("Failed to upload photo for session {}", sessionId, e);
            throw new RuntimeException("Upload failed", e);
        }
    }

    public SessionPhotosResponse getPhotos(UUID sessionId) {
        SessionState state = getSessionOrThrow(sessionId);
        return new SessionPhotosResponse(
                sessionId,
                List.copyOf(state.photos()),
                state.complete(),
                state.photos().size()
        );
    }

    public CompleteResponse completeSession(UUID sessionId) {
        SessionState state = getSessionOrThrow(sessionId);
        sessions.put(sessionId, new SessionState(state.createdAt(), state.photos(), true));
        return new CompleteResponse(sessionId, state.photos().size(), true);
    }

    public void deleteSession(UUID sessionId) {
        sessions.remove(sessionId);
        try {
            var objects = minio.listObjects(ListObjectsArgs.builder()
                    .bucket(bucket).prefix(sessionId.toString() + "/").build());
            for (var obj : objects) {
                minio.removeObject(RemoveObjectArgs.builder()
                        .bucket(bucket).object(obj.get().object()).build());
            }
        } catch (Exception e) {
            log.warn("Failed to clean up MinIO objects for session {}", sessionId, e);
        }
    }

    public InputStream getPhotoStream(UUID sessionId, int index) {
        try {
            return minio.getObject(GetObjectArgs.builder()
                    .bucket(bucket)
                    .object(sessionId + "/" + index + ".jpg")
                    .build());
        } catch (Exception e) {
            throw new RuntimeException("Photo not found", e);
        }
    }

    @Scheduled(fixedRate = 300_000) // every 5 minutes
    public void cleanupExpired() {
        Instant cutoff = Instant.now().minusSeconds(STORAGE_TTL_HOURS * 3600);
        sessions.entrySet().removeIf(entry -> {
            if (entry.getValue().createdAt().isBefore(cutoff)) {
                deleteSession(entry.getKey());
                return true;
            }
            return false;
        });
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
```

- [ ] **Step 2: Verify compilation**

Run: `cd backend/ai-service && mvn compile -q`
Expected: BUILD SUCCESS (may need to add MinIO SDK to pom.xml — see Task 4)

- [ ] **Step 3: Commit**

```bash
git add backend/ai-service/src/main/java/io/smartpos/ai/application/CaptureSessionService.java
git commit -m "feat: add capture session service with MinIO storage"
```

---

### Task 3: Backend Controller

**Files:**
- Create: `backend/ai-service/src/main/java/io/smartpos/ai/api/CaptureSessionController.java`

- [ ] **Step 1: Create CaptureSessionController.java**

```java
package io.smartpos.ai.api;

import io.smartpos.ai.api.dto.CaptureSessionDtos.*;
import io.smartpos.ai.application.CaptureSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/ai/capture-sessions")
@RequiredArgsConstructor
public class CaptureSessionController {

    private final CaptureSessionService service;

    @PostMapping
    public CreateSessionResponse create() {
        return service.createSession();
    }

    @PostMapping(value = "/{id}/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PhotoUploadResponse uploadPhoto(@PathVariable UUID id,
                                           @RequestParam("photo") MultipartFile file) {
        return service.uploadPhoto(id, file);
    }

    @GetMapping("/{id}/photos")
    public SessionPhotosResponse getPhotos(@PathVariable UUID id) {
        return service.getPhotos(id);
    }

    @GetMapping("/{id}/photos/{index}/full")
    public ResponseEntity<InputStreamResource> getFullPhoto(@PathVariable UUID id,
                                                            @PathVariable int index) {
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_JPEG)
                .body(new InputStreamResource(service.getPhotoStream(id, index)));
    }

    @GetMapping("/{id}/photos/{index}/thumb")
    public ResponseEntity<InputStreamResource> getThumbnail(@PathVariable UUID id,
                                                            @PathVariable int index) {
        // For now, serve the same image as full. In production, generate thumbnails.
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_JPEG)
                .body(new InputStreamResource(service.getPhotoStream(id, index)));
    }

    @PostMapping("/{id}/complete")
    public CompleteResponse complete(@PathVariable UUID id) {
        return service.completeSession(id);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancel(@PathVariable UUID id) {
        service.deleteSession(id);
        return ResponseEntity.noContent().build();
    }
}
```

- [ ] **Step 2: Verify compilation**

Run: `cd backend/ai-service && mvn compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 3: Commit**

```bash
git add backend/ai-service/src/main/java/io/smartpos/ai/api/CaptureSessionController.java
git commit -m "feat: add capture session REST controller"
```

---

### Task 4: Backend Dependencies & Config

**Files:**
- Modify: `backend/ai-service/pom.xml` (add MinIO SDK if missing)

- [ ] **Step 1: Check if MinIO SDK is already a dependency**

Run: `grep -r "minio" backend/ai-service/pom.xml`
Expected: Check output. If empty, add the dependency.

- [ ] **Step 2: Add MinIO dependency if missing**

Add inside `<dependencies>` in `backend/ai-service/pom.xml`:

```xml
<dependency>
    <groupId>io.minio</groupId>
    <artifactId>minio</artifactId>
    <version>8.5.7</version>
</dependency>
```

- [ ] **Step 3: Add application properties**

Add to `backend/ai-service/src/main/resources/application.yml`:

```yaml
app:
  capture:
    base-url: ${CAPTURE_BASE_URL:http://localhost:5173}
    bucket: capture-sessions

minio:
  endpoint: ${MINIO_ENDPOINT:http://localhost:9000}
  access-key: ${MINIO_ACCESS_KEY:minioadmin}
  secret-key: ${MINIO_SECRET_KEY:minioadmin}
```

- [ ] **Step 4: Verify build**

Run: `cd backend/ai-service && mvn compile -q`
Expected: BUILD SUCCESS

- [ ] **Step 5: Commit**

```bash
git add backend/ai-service/pom.xml backend/ai-service/src/main/resources/application.yml
git commit -m "chore: add MinIO SDK dependency and capture config"
```

---

### Task 5: Frontend API Client

**Files:**
- Create: `frontend/src/api/smartpos/captureSession.ts`

- [ ] **Step 1: Create captureSession.ts**

```typescript
import { api } from './client';

export interface CreateSessionResponse {
  sessionId: string;
  qrUrl: string;
  expiresAt: string;
}

export interface PhotoInfo {
  photoId: string;
  index: number;
  thumbnailUrl: string;
  fullUrl: string;
}

export interface SessionPhotosResponse {
  sessionId: string;
  photos: PhotoInfo[];
  complete: boolean;
  photoCount: number;
}

export interface CompleteResponse {
  sessionId: string;
  photoCount: number;
  complete: boolean;
}

export async function createCaptureSession(): Promise<CreateSessionResponse> {
  const { data } = await api.post<CreateSessionResponse>('/api/v1/ai/capture-sessions');
  return data;
}

export async function getCaptureSessionPhotos(sessionId: string): Promise<SessionPhotosResponse> {
  const { data } = await api.get<SessionPhotosResponse>(
    `/api/v1/ai/capture-sessions/${sessionId}/photos`,
  );
  return data;
}

export async function deleteCaptureSession(sessionId: string): Promise<void> {
  await api.delete(`/api/v1/ai/capture-sessions/${sessionId}`);
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | grep -i "captureSession\|error" | head -5`
Expected: No errors referencing captureSession.ts

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/smartpos/captureSession.ts
git commit -m "feat: add capture session API client"
```

---

### Task 6: Phone Camera Page

**Files:**
- Create: `frontend/src/views/pages/capture/CameraPage.tsx`

- [ ] **Step 1: Create CameraPage.tsx**

```tsx
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';
import {
  Box, Button, Typography, CircularProgress, IconButton, Stack,
} from '@mui/material';
import { IconCamera, IconTrash, IconCheck, IconArrowLeft } from '@tabler/icons-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080';

interface CapturedPhoto {
  dataUrl: string;
  blob: Blob;
}

export default function CameraPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photos, setPhotos] = useState<CapturedPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((s) => {
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => setError('Camera not available. Check permissions.'));
    return () => { stream?.getTracks().forEach((t) => t.stop()); };
  }, []);

  const capture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setPhotos((prev) => {
        if (prev.length >= 20) return prev;
        return [...prev, { dataUrl, blob }];
      });
    }, 'image/jpeg', 0.85);
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadAll = async () => {
    if (!sessionId) return;
    setUploading(true);
    for (let i = 0; i < photos.length; i++) {
      setUploadProgress({ current: i + 1, total: photos.length });
      const form = new FormData();
      form.append('photo', photos[i].blob, `photo-${i}.jpg`);
      await fetch(`${API_BASE}/api/v1/ai/capture-sessions/${sessionId}/photos`, {
        method: 'POST',
        body: form,
      });
    }
    await fetch(`${API_BASE}/api/v1/ai/capture-sessions/${sessionId}/complete`, {
      method: 'POST',
    });
    setUploading(false);
    setDone(true);
  };

  if (error) {
    return (
      <Box sx={{ minHeight: '100dvh', bgcolor: '#000', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>{error}</Typography>
        <Button variant="outlined" onClick={() => window.location.reload()} sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}>
          Retry
        </Button>
      </Box>
    );
  }

  if (done) {
    return (
      <Box sx={{ minHeight: '100dvh', bgcolor: '#000', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <IconCheck size={48} color="#4ADE80" />
        <Typography variant="h6">Photos sent</Typography>
        <Typography variant="body2" color="grey.500">You can close this page</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: '#000', color: '#fff', display: 'flex', flexDirection: 'column' }}>
      {/* Viewfinder */}
      <Box sx={{ flex: 1, position: 'relative', bgcolor: '#111' }}>
        <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {uploading && (
          <Box sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress sx={{ color: '#4ADE80', mb: 2 }} />
            <Typography>Sending {uploadProgress.current} of {uploadProgress.total}...</Typography>
          </Box>
        )}
      </Box>

      {/* Thumbnail strip */}
      {photos.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ px: 1.5, py: 1, overflowX: 'auto', bgcolor: '#0a0a0a' }}>
          {photos.map((p, i) => (
            <Box key={i} sx={{ position: 'relative', flexShrink: 0 }}>
              <Box component="img" src={p.dataUrl} sx={{ width: 48, height: 48, borderRadius: '8px', objectFit: 'cover' }} />
              <IconButton
                size="small"
                onClick={() => removePhoto(i)}
                sx={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, bgcolor: 'error.main', color: '#fff', '&:hover': { bgcolor: 'error.dark' } }}
              >
                <IconTrash size={10} />
              </IconButton>
            </Box>
          ))}
        </Stack>
      )}

      {/* Controls */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="caption" color="grey.500">{photos.length}/20</Typography>
        <IconButton onClick={capture} disabled={uploading} sx={{
          width: 64, height: 64, border: '3px solid #fff', borderRadius: '50%',
          bgcolor: 'transparent', '&:active': { bgcolor: 'rgba(255,255,255,0.2)' },
        }}>
          <IconCamera size={28} color="#fff" />
        </IconButton>
        <Button
          variant="contained"
          disabled={photos.length === 0 || uploading}
          onClick={uploadAll}
          sx={{ borderRadius: '12px', bgcolor: '#4ADE80', color: '#000', fontWeight: 800, textTransform: 'none', '&:hover': { bgcolor: '#22C55E' } }}
        >
          Done
        </Button>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | grep "CameraPage\|error TS" | head -5`
Expected: No errors referencing CameraPage.tsx

- [ ] **Step 3: Commit**

```bash
git add frontend/src/views/pages/capture/CameraPage.tsx
git commit -m "feat: add phone camera capture page"
```

---

### Task 7: Route Registration

**Files:**
- Modify: `frontend/src/routes/Router.tsx`

- [ ] **Step 1: Add lazy import for CameraPage**

Add after line 11 (BlankLayout import), near other lazy imports:

```tsx
const CaptureCamera = Loadable(lazy(() => import('../views/pages/capture/CameraPage')));
```

- [ ] **Step 2: Add route under BlankLayout**

Add inside the BlankLayout children array (after the landingpage line):

```tsx
{ path: '/capture/:sessionId', element: <CaptureCamera /> },
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | grep "Router\|error TS" | head -5`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/routes/Router.tsx
git commit -m "feat: add /capture/:sessionId route"
```

---

### Task 8: QR Overlay Component

**Files:**
- Create: `frontend/src/views/smartpos/products/QrOverlay.tsx`

- [ ] **Step 1: Install qrcode dependency**

Run: `cd frontend && npm install qrcode && npm install -D @types/qrcode`

- [ ] **Step 2: Create QrOverlay.tsx**

```tsx
import { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Button, CircularProgress, Stack,
} from '@mui/material';
import { IconCamera, IconRefresh, IconCircleCheck } from '@tabler/icons-react';
import QRCode from 'qrcode';
import {
  createCaptureSession,
  getCaptureSessionPhotos,
  deleteCaptureSession,
  type PhotoInfo,
} from 'src/api/smartpos/captureSession';

interface QrOverlayProps {
  onPhotosReady: (photoUrls: string[]) => void;
  onCancel: () => void;
}

type OverlayState =
  | { kind: 'creating' }
  | { kind: 'ready'; sessionId: string; qrUrl: string }
  | { kind: 'polling'; sessionId: string; qrUrl: string; count: number }
  | { kind: 'complete'; photos: PhotoInfo[] }
  | { kind: 'expired' }
  | { kind: 'error'; message: string };

export default function QrOverlay({ onPhotosReady, onCancel }: QrOverlayProps) {
  const [state, setState] = useState<OverlayState>({ kind: 'creating' });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    createCaptureSession()
      .then((res) => {
        setState({ kind: 'ready', sessionId: res.sessionId, qrUrl: res.qrUrl });
      })
      .catch((err) => setState({ kind: 'error', message: err.message }));
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  useEffect(() => {
    if (state.kind === 'ready' || state.kind === 'polling') {
      const sessionId = state.sessionId;
      // Render QR code
      if (canvasRef.current && 'qrUrl' in state) {
        QRCode.toCanvas(canvasRef.current, state.qrUrl, { width: 220, margin: 2 });
      }
      // Start polling
      pollRef.current = setInterval(async () => {
        try {
          const res = await getCaptureSessionPhotos(sessionId);
          if (res.photos.length > 0 && !res.complete) {
            setState({ kind: 'polling', sessionId, qrUrl: (state as any).qrUrl, count: res.photos.length });
          }
          if (res.complete && res.photos.length > 0) {
            clearInterval(pollRef.current);
            setState({ kind: 'complete', photos: res.photos });
          }
        } catch {
          // session may have expired
          setState({ kind: 'expired' });
        }
      }, 3000);
      return () => { clearInterval(pollRef.current); };
    }
  }, [state.kind]);

  const handleUsePhotos = () => {
    if (state.kind === 'complete') {
      const urls = state.photos.map((p) => p.fullUrl);
      onPhotosReady(urls);
    }
  };

  const handleCancel = () => {
    if ('sessionId' in state) deleteCaptureSession(state.sessionId).catch(() => {});
    onCancel();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 3, gap: 2 }}>
      {state.kind === 'creating' && (
        <>
          <CircularProgress size={32} />
          <Typography variant="body2" color="text.secondary">Creating session...</Typography>
        </>
      )}

      {(state.kind === 'ready' || state.kind === 'polling') && (
        <>
          <Typography variant="subtitle1" fontWeight={700}>Scan with your phone</Typography>
          <canvas ref={canvasRef} style={{ borderRadius: '12px' }} />
          <Stack direction="row" spacing={1} alignItems="center">
            {state.kind === 'ready' ? (
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'warning.main', animation: 'pulse 1.5s infinite' }} />
            ) : (
              <Typography variant="body2" color="primary.main" fontWeight={700}>
                Receiving {state.count} photo{state.count > 1 ? 's' : ''}...
              </Typography>
            )}
            {state.kind === 'ready' && (
              <Typography variant="body2" color="text.secondary">Waiting for phone...</Typography>
            )}
          </Stack>
          <Button variant="text" size="small" startIcon={<IconRefresh size={14} />} onClick={() => {
            if ('sessionId' in state) {
              getCaptureSessionPhotos(state.sessionId).then((res) => {
                if (res.complete && res.photos.length > 0) {
                  setState({ kind: 'complete', photos: res.photos });
                } else if (res.photos.length > 0) {
                  setState({ kind: 'polling', sessionId: state.sessionId, qrUrl: (state as any).qrUrl, count: res.photos.length });
                }
              }).catch(() => setState({ kind: 'expired' }));
            }
          }}>
            Check for photos
          </Button>
        </>
      )}

      {state.kind === 'complete' && (
        <>
          <IconCircleCheck size={40} color="#4ADE80" />
          <Typography variant="subtitle1" fontWeight={700}>
            {state.photos.length} photo{state.photos.length > 1 ? 's' : ''} received
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={handleUsePhotos} sx={{ borderRadius: '10px' }}>
              Continue with photos
            </Button>
            <Button variant="outlined" onClick={handleCancel} sx={{ borderRadius: '10px' }}>
              Cancel
            </Button>
          </Stack>
        </>
      )}

      {state.kind === 'expired' && (
        <>
          <Typography variant="subtitle1" fontWeight={700} color="error.main">Session expired</Typography>
          <Button variant="outlined" onClick={() => setState({ kind: 'creating' })} sx={{ borderRadius: '10px' }}>
            Create new session
          </Button>
        </>
      )}

      {state.kind === 'error' && (
        <>
          <Typography variant="subtitle1" fontWeight={700} color="error.main">{state.message}</Typography>
          <Button variant="outlined" onClick={() => setState({ kind: 'creating' })} sx={{ borderRadius: '10px' }}>
            Retry
          </Button>
        </>
      )}

      {/* Escape hatch */}
      {(state.kind === 'ready' || state.kind === 'polling') && (
        <Button variant="text" size="small" startIcon={<IconCamera size={14} />} onClick={handleCancel} sx={{ mt: 1 }}>
          Use webcam instead
        </Button>
      )}
    </Box>
  );
}
```

- [ ] **Step 3: Verify TypeScript compilation**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | grep "QrOverlay\|error TS" | head -5`
Expected: No errors referencing QrOverlay.tsx

- [ ] **Step 4: Commit**

```bash
git add frontend/src/views/smartpos/products/QrOverlay.tsx frontend/package.json frontend/package-lock.json
git commit -m "feat: add QR overlay component for cross-device capture"
```

---

### Task 9: Integration with ProductsImportDialog

**Files:**
- Modify: `frontend/src/views/smartpos/products/ProductsImportDialog.tsx`

- [ ] **Step 1: Import QrOverlay**

Add import near line 44 (after other imports):

```tsx
import QrOverlay from './QrOverlay';
```

- [ ] **Step 2: Add state for phone camera mode**

Add after existing state declarations (after `cameraInputRef`):

```tsx
const [phoneCameraOpen, setPhoneCameraOpen] = useState(false);
```

- [ ] **Step 3: Add "Phone Camera" button**

In the photo input mode buttons section (around line 834), add a new button before "Take photo":

Replace the existing button block:
```tsx
{inputMode === 'photos' && (
  <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
    <Button
      variant="outlined"
      startIcon={<IconCamera size={14} />}
      size="small"
      sx={{ borderRadius: '8px', textTransform: 'none' }}
      onClick={(e) => {
        e.stopPropagation();
        cameraInputRef.current?.click();
      }}
    >
      Take photo
    </Button>
```

With new block:
```tsx
{inputMode === 'photos' && (
  <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 2 }}>
    <Button
      variant="contained"
      startIcon={<IconCamera size={14} />}
      size="small"
      sx={{ borderRadius: '8px', textTransform: 'none', bgcolor: brand.primary[600] }}
      onClick={(e) => {
        e.stopPropagation();
        setPhoneCameraOpen(true);
      }}
    >
      Phone Camera
    </Button>
    <Button
      variant="outlined"
      startIcon={<IconCamera size={14} />}
      size="small"
      sx={{ borderRadius: '8px', textTransform: 'none' }}
      onClick={(e) => {
        e.stopPropagation();
        cameraInputRef.current?.click();
      }}
    >
      Take photo
    </Button>
```

- [ ] **Step 4: Add QrOverlay rendering**

After the hidden camera `<input>` block and before the spreadsheet success indicator, add:

```tsx
{phoneCameraOpen && (
  <Box sx={{ mt: 2 }}>
    <QrOverlay
      onPhotosReady={async (photoUrls) => {
        setPhoneCameraOpen(false);
        // Convert full URLs to data URLs by fetching through the API
        const fetchUrl = (url: string) =>
          fetch(url).then((r) => r.blob()).then(
            (b) => new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(b);
            })
          );
        const dataUrls = await Promise.all(photoUrls.map(fetchUrl));
        // Pass data URLs into existing photo processing
        const files = await Promise.all(
          photoUrls.map(async (url, i) => {
            const blob = await fetch(url).then((r) => r.blob());
            return new File([blob], `phone-photo-${i}.jpg`, { type: 'image/jpeg' });
          })
        );
        processPhotos(files);
      }}
      onCancel={() => setPhoneCameraOpen(false)}
    />
  </Box>
)}
```

- [ ] **Step 5: Verify TypeScript compilation**

Run: `cd frontend && npx tsc --noEmit --pretty 2>&1 | grep "ProductsImportDialog\|error TS" | head -5`
Expected: No errors

- [ ] **Step 6: Commit**

```bash
git add frontend/src/views/smartpos/products/ProductsImportDialog.tsx
git commit -m "feat: integrate phone camera QR overlay into smart import"
```

---

### Task 10: End-to-End Verification

- [ ] **Step 1: Start infrastructure**

Run: `cd backend && docker compose up -d` (or `make dev-infra`)
Expected: MinIO running on port 9000

- [ ] **Step 2: Start ai-service**

Run: `cd backend/ai-service && mvn spring-boot:run`
Expected: ai-service starts, registers `/api/v1/ai/capture-sessions` routes

- [ ] **Step 3: Start frontend**

Run: `cd frontend && npm run dev`
Expected: Vite dev server on port 5173

- [ ] **Step 4: Verify flow**

| Step | Expected |
|---|---|
| Open Smart Import → Photos tab | "Phone Camera" button visible |
| Click "Phone Camera" | QR code renders |
| Scan QR with phone | Camera page opens |
| Take 2-3 photos on phone | Thumbnails appear below viewfinder |
| Tap "Done" on phone | "Photos sent" confirmation |
| Desktop polls | QR overlay shows "2 photos received" → green check |
| Click "Continue with photos" | Photos appear in Smart Import review step |
| Existing "Take photo" (webcam) | Still works |
| Session expiry | "Session expired" message after 10 min |

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: e2e tweaks for cross-device capture flow"
```
