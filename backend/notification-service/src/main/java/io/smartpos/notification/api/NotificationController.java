package io.smartpos.notification.api;

import io.smartpos.notification.api.dto.DeliveryDto;
import io.smartpos.notification.api.dto.MultiSendRequest;
import io.smartpos.notification.api.dto.SendRequest;
import io.smartpos.notification.application.NotificationService;
import io.smartpos.notification.domain.model.Channel;
import io.smartpos.notification.domain.model.DeliveryStatus;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService service;

    @GetMapping
    @PreAuthorize("hasAuthority('notification.view')")
    public Page<DeliveryDto> search(@RequestParam(required = false) Channel channel,
                                    @RequestParam(required = false) DeliveryStatus status,
                                    @RequestParam(required = false) String recipient,
                                    Pageable pageable) {
        return service.search(channel, status, recipient, pageable);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('notification.view')")
    public DeliveryDto get(@PathVariable UUID id) { return service.get(id); }

    @PostMapping
    @PreAuthorize("hasAuthority('notification.send')")
    public ResponseEntity<DeliveryDto> send(@Valid @RequestBody SendRequest req) {
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(service.send(req));
    }

    @PostMapping("/multi")
    @PreAuthorize("hasAuthority('notification.send')")
    public ResponseEntity<List<DeliveryDto>> sendMulti(@Valid @RequestBody MultiSendRequest req) {
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(service.sendMulti(req));
    }

    @PostMapping("/{id}/retry")
    @PreAuthorize("hasAuthority('notification.send')")
    public DeliveryDto retry(@PathVariable UUID id) { return service.retry(id); }

    /** Internal endpoint for sales/quotation/return services to fire notifications. */
    @PostMapping("/internal/send")
    @PreAuthorize("hasAuthority('internal.notification.send')")
    public ResponseEntity<DeliveryDto> internalSend(@Valid @RequestBody SendRequest req) {
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(service.send(req));
    }
}
