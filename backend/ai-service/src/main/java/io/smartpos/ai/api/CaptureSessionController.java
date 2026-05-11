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
    public ResponseEntity<CreateSessionResponse> create() {
        return ResponseEntity.ok(service.createSession());
    }

    @PostMapping(value = "/{id}/photos", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<PhotoUploadResponse> uploadPhoto(
            @PathVariable UUID id,
            @RequestParam("photo") MultipartFile file,
            @RequestHeader(value = "X-Capture-Token", required = false) String tokenHeader,
            @RequestParam(value = "t", required = false) String tokenParam) {
        service.verifyUploadToken(id, tokenHeader != null ? tokenHeader : tokenParam);
        return ResponseEntity.ok(service.uploadPhoto(id, file));
    }

    @GetMapping("/{id}/photos")
    public ResponseEntity<SessionPhotosResponse> getPhotos(@PathVariable UUID id) {
        // POS polls this with a JWT; phone never calls it. Token check left off
        // so the POS dashboard can show progress without juggling the token.
        return ResponseEntity.ok(service.getPhotos(id));
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
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_JPEG)
                .body(new InputStreamResource(service.getPhotoStream(id, index)));
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<CompleteResponse> complete(
            @PathVariable UUID id,
            @RequestHeader(value = "X-Capture-Token", required = false) String tokenHeader,
            @RequestParam(value = "t", required = false) String tokenParam) {
        service.verifyUploadToken(id, tokenHeader != null ? tokenHeader : tokenParam);
        return ResponseEntity.ok(service.completeSession(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> cancel(@PathVariable UUID id) {
        service.deleteSession(id);
        return ResponseEntity.noContent().build();
    }
}
