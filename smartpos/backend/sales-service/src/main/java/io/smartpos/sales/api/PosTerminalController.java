package io.smartpos.sales.api;

import io.smartpos.sales.api.dto.PosTerminalDto;
import io.smartpos.sales.application.CustomerDisplayBroker;
import io.smartpos.sales.application.PosTerminalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * REST + SSE for the POS hardware abstraction:
 *
 *   GET  /pos-terminals                 → list registered tills
 *   POST /pos-terminals                 → register a new till
 *   POST /pos-terminals/pair/{token}    → customer-display pairs by token
 *   POST /pos-terminals/{id}/events     → cashier UI broadcasts a cart event
 *   GET  /pos-terminals/{id}/stream     → customer display subscribes to events (SSE)
 *
 * Camera scanner & digital scale: handled CLIENT-SIDE in the POS UI via
 * WebHID / WebUSB. The parsed barcode/weight is then POSTed to the existing
 * /pos/sales endpoints — no new backend wiring needed for those.
 */
@RestController
@RequestMapping("/api/v1/pos-terminals")
@RequiredArgsConstructor
public class PosTerminalController {

    private final PosTerminalService service;
    private final CustomerDisplayBroker broker;

    @GetMapping
    @PreAuthorize("hasAuthority('pos.terminal.view')")
    public List<PosTerminalDto> list(@RequestParam(required = false) UUID warehouseId) {
        return service.list(warehouseId);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('pos.terminal.view')")
    public PosTerminalDto get(@PathVariable UUID id) { return service.get(id); }

    @PostMapping
    @PreAuthorize("hasAuthority('pos.terminal.manage')")
    public ResponseEntity<PosTerminalDto> create(@Valid @RequestBody PosTerminalDto.CreateRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(req));
    }

    @PostMapping("/pair/{token}")
    @PreAuthorize("hasAuthority('pos.terminal.view') or hasAuthority('pos.use')")
    public PosTerminalDto pair(@PathVariable String token) { return service.pair(token); }

    @PostMapping("/{id}/rotate-token")
    @PreAuthorize("hasAuthority('pos.terminal.manage')")
    public PosTerminalDto rotateToken(@PathVariable UUID id) { return service.rotateToken(id); }

    /**
     * Cashier UI calls this to push a cart-update / payment / message to the
     * paired customer display. Body is forwarded as-is in {@code payload}.
     */
    @PostMapping("/{id}/events")
    @PreAuthorize("hasAuthority('pos.use')")
    public Map<String, Integer> publish(@PathVariable UUID id,
                                        @RequestParam String type,
                                        @RequestBody(required = false) Object payload) {
        int delivered = broker.publish(id, PosTerminalDto.DisplayEvent.of(type, payload));
        return Map.of("delivered", delivered);
    }

    /**
     * Customer display subscribes here. Browsers handle reconnection
     * automatically (Last-Event-ID header) when the connection drops.
     * Production: in front of multi-replica deployment, route by terminalId
     * (sticky session) or replace the broker with Redis pub/sub.
     */
    @GetMapping(value = "/{id}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@PathVariable UUID id) {
        return broker.subscribe(id);
    }
}
