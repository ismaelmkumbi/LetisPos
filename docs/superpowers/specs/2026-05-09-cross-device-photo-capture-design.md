# Cross-Device Photo Capture for Smart Import

**Date:** 2026-05-09
**Status:** approved

## Goal

Replace the desktop webcam "Take photo" flow in Smart Import with a cross-device capture system: the desktop shows a QR code, the user scans it with their phone, the phone camera opens, user takes product photos, and photos flow back to the POS automatically via a shared session.

## Why

Desktop webcams are awkward for product photography — poor quality, fixed position, inconvenient. Phone cameras are superior. A QR code bridge is frictionless (no app install, no login, no Bluetooth pairing).

## Scope

- New backend: capture session API (create, upload photos, poll, complete)
- New mobile web page: camera capture UI
- Modified desktop UI: QR overlay replacing webcam in photo input mode
- Modified ProductsImportDialog: integration point

Out of scope:
- Mobile app wrapper
- Video/live preview streaming
- Barcode scanning from phone camera

---

## Architecture

```
Desktop POS                    Backend (API)               Phone Browser
────────────                  ──────────────              ─────────────

1. Click "Phone Camera"
   → POST /capture-sessions
   ← { sessionId, qrUrl }

2. Render QR code
   (client-side from qrUrl)

                               ← 3. User scans QR ─────→ Opens qrUrl
                                                          Camera page loads
                                                          getUserMedia()
                                                          User takes photos

                               ← 4. POST /sessions/      Upload photos
                                   {id}/photos            (multipart, sequential)
                                   → { photoId }

                               ← 5. POST /sessions/       Mark complete
                                   {id}/complete
                                   → { photoCount }

6. Poll GET /sessions/
   {id}/photos
   ← { photos: [...], complete }

7. Feed photos into
   existing aiImportFromImages()
8. Show in review step
```

## API Design

### POST /api/v1/ai/capture-sessions

Create a capture session. Returns a QR URL the phone will open.

Request: `{}` (no body needed)
Response:
```json
{
  "sessionId": "uuid",
  "qrUrl": "https://app.letispos.com/capture/uuid",
  "expiresAt": "2026-05-09T12:10:00Z"
}
```

### POST /api/v1/ai/capture-sessions/:id/photos

Upload a photo from the phone. Multipart form data. Called once per photo.

Request: `multipart/form-data` with field `photo` (image/jpeg)
Response:
```json
{
  "photoId": "uuid",
  "index": 1,
  "thumbnailUrl": "/api/v1/ai/capture-sessions/:id/photos/:photoId/thumb"
}
```

### GET /api/v1/ai/capture-sessions/:id/photos

Polled by the desktop to check for new photos.

Response:
```json
{
  "sessionId": "uuid",
  "photos": [
    { "photoId": "uuid", "index": 0, "thumbnailUrl": "...", "fullUrl": "..." }
  ],
  "complete": true,
  "photoCount": 5
}
```

### POST /api/v1/ai/capture-sessions/:id/complete

Called by the phone when user taps "Done". Signals no more photos coming.

Response:
```json
{
  "sessionId": "uuid",
  "photoCount": 5,
  "complete": true
}
```

### DELETE /api/v1/ai/capture-sessions/:id

Desktop cancels or closes the session. Cleans up uploaded photos.

## Phone Camera Page (`/capture/:sessionId`)

### Behavior
- Opens camera via `getUserMedia({ video: { facingMode: 'environment' } })`
- Live viewfinder filling most of the screen
- Capture button (large circle, bottom center)
- Thumbnail strip below viewfinder showing captured photos
- Tap thumbnail to delete that photo
- "Done" button (top right) — uploads all photos sequentially with progress

### States
| State | UI |
|---|---|
| Loading | Permission prompt / camera loading spinner |
| Ready | Viewfinder live + no thumbnails yet |
| Capturing | Flash animation + thumbnail added |
| Uploading | Progress bar: "Sending 3 of 5..." |
| Complete | Checkmark + "Photos sent — you can close this page" |
| Error | "Camera not available. Check permissions." |

### Constraints
- Max 20 photos per session
- Photos captured at device resolution, uploaded as JPEG
- Thumbnails generated client-side (canvas resize) before display
- Page works standalone (no dependencies on the main app)

## Desktop QR Overlay

### Behavior
- Card overlay replacing the current webcam preview area in photo input mode
- Client-side QR code generation (qrcode.js or similar lightweight lib) from `qrUrl`
- "Waiting for phone..." status below QR
- Polls `GET /sessions/:id/photos` every 3 seconds
- When photos arrive: status changes to "Received 5 photos"
- When `complete: true`: auto-transition photos into the existing `runAiImportFromImages()` flow
- Manual "Check for photos" button for the refresh fallback
- "Use webcam instead" link at the bottom as escape hatch
- Session cleanup on unmount/close

### States
| State | UI |
|---|---|
| Creating | Spinner "Creating session..." |
| Ready | QR code + "Scan with your phone camera" |
| Waiting | QR code + pulsing dot "Waiting for phone..." |
| Receiving | QR dimmed + "Receiving 3 photos..." |
| Complete | Green check + photos transitioning to review |
| Expired | "Session expired" + "Create new" button |
| Error | Error message + retry |

## Integration with Existing Code

### ProductsImportDialog.tsx changes
- New tab/button in photo input mode: "Phone Camera" alongside "Take photo" (webcam)
- Clicking "Phone Camera" → creates session → shows QrOverlay
- When QrOverlay completes → receives photo URLs → calls `runAiImportFromImages(photoUrls)`
- Reuses existing Step 2 (AI mapping) and Step 3 (review) unchanged

### New files
| File | Purpose |
|---|---|
| `frontend/src/views/smartpos/products/CaptureSessionApi.ts` | API client for session CRUD |
| `frontend/src/views/smartpos/products/QrOverlay.tsx` | Desktop QR overlay component |
| `frontend/src/views/pages/capture/CameraPage.tsx` | Phone camera capture page |
| `frontend/src/routes/CaptureRoute.tsx` | Route for `/capture/:sessionId` |

### Route
- `/capture/:sessionId` → `CameraPage` (lazy loaded, standalone, no auth required — session ID is the auth)

## Session Lifecycle
- Created on demand, expires after 10 minutes
- Max 20 photos per session
- Max 10MB per photo
- Photos stored temporarily on server, deleted after:
  - Desktop imports them (calls `aiImportFromImages`)
  - Session expires (1 hour TTL on storage)
  - Desktop explicitly cancels

## Testing
- [ ] QR code renders and is scannable from phone
- [ ] Phone camera opens via QR URL on both iOS and Android
- [ ] Photos captured on phone appear on desktop within 3-6 seconds
- [ ] "Done" on phone marks session complete, desktop auto-advances
- [ ] Manual "Check for photos" works as fallback
- [ ] Session expiry: QR overlay shows expiry message
- [ ] "Use webcam instead" fallback still works
- [ ] Existing spreadsheet/PDF import paths unaffected
