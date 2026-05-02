package io.smartpos.sales.application;

import io.smartpos.sales.api.dto.PosTerminalDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * In-memory fan-out for customer-display SSE streams. Each terminal can have
 * multiple active emitters (e.g. main display + tablet mirror). The cashier's
 * POS posts events to {@code /api/v1/pos-terminals/{id}/events} which the
 * broker pushes to all subscribers.
 *
 * For production: swap this for Redis pub/sub so the broker survives restarts
 * and works across multiple sales-service instances. The interface stays the
 * same — only {@link #publish} and the registry need to change.
 */
@Slf4j
@Component
public class CustomerDisplayBroker {

    private static final long TIMEOUT_MS = 30 * 60 * 1000L; // 30 min keep-alive

    private final ConcurrentHashMap<UUID, CopyOnWriteArrayList<SseEmitter>> emittersByTerminal = new ConcurrentHashMap<>();

    public SseEmitter subscribe(UUID terminalId) {
        SseEmitter emitter = new SseEmitter(TIMEOUT_MS);
        emittersByTerminal.computeIfAbsent(terminalId, id -> new CopyOnWriteArrayList<>()).add(emitter);
        emitter.onCompletion(() -> remove(terminalId, emitter));
        emitter.onTimeout(()    -> remove(terminalId, emitter));
        emitter.onError(t       -> remove(terminalId, emitter));
        try {
            emitter.send(SseEmitter.event().name("connected").data("ok"));
        } catch (IOException ignored) { /* client disconnected immediately */ }
        return emitter;
    }

    public int publish(UUID terminalId, PosTerminalDto.DisplayEvent event) {
        List<SseEmitter> list = emittersByTerminal.get(terminalId);
        if (list == null || list.isEmpty()) return 0;
        int delivered = 0;
        for (SseEmitter e : list) {
            try {
                e.send(SseEmitter.event().name(event.type()).data(event));
                delivered++;
            } catch (IOException ex) {
                log.debug("Display emitter dropped: {}", ex.getMessage());
                remove(terminalId, e);
            }
        }
        return delivered;
    }

    private void remove(UUID terminalId, SseEmitter emitter) {
        CopyOnWriteArrayList<SseEmitter> list = emittersByTerminal.get(terminalId);
        if (list != null) list.remove(emitter);
    }
}
