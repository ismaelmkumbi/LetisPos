package io.smartpos.ai.api;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;
import java.util.NoSuchElementException;

@RestControllerAdvice(assignableTypes = CaptureSessionController.class)
class CaptureExceptionHandler {

    @ExceptionHandler(NoSuchElementException.class)
    ResponseEntity<Map<String, String>> notFound(NoSuchElementException e) {
        return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    ResponseEntity<Map<String, String>> expired(IllegalStateException e) {
        return ResponseEntity.status(410).body(Map.of("error", e.getMessage()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<Map<String, String>> badRequest(IllegalArgumentException e) {
        return ResponseEntity.status(400).body(Map.of("error", e.getMessage()));
    }

    @ExceptionHandler(SecurityException.class)
    ResponseEntity<Map<String, String>> forbidden(SecurityException e) {
        return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
    }
}
