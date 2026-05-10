package io.smartpos.hub.application;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
@RequiredArgsConstructor
@Slf4j
public class OfflineDetector {

    private final AgentService agentService;

    @Scheduled(fixedRate = 15_000)
    public void checkOffline() {
        agentService.markOfflineAfter(Instant.now().minusSeconds(30));
    }
}
