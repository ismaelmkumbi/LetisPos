package io.smartpos.hub.application;

import io.smartpos.hub.domain.Agent;
import io.smartpos.hub.domain.AgentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AgentService {
    private final AgentRepository repo;

    @Transactional
    public Agent registerOrUpdate(String hostname, String ipAddress, String version) {
        Agent agent = repo.findByHostname(hostname)
            .map(a -> {
                a.setIpAddress(ipAddress);
                a.setVersion(version);
                a.setLastSeen(Instant.now());
                a.setStatus("online");
                return a;
            })
            .orElseGet(() -> Agent.builder()
                .id(UUID.randomUUID())
                .hostname(hostname)
                .ipAddress(ipAddress)
                .version(version)
                .build());
        return repo.save(agent);
    }

    public List<Agent> findAll() {
        return repo.findAll();
    }

    public Agent findByHostname(String hostname) {
        return repo.findByHostname(hostname)
            .orElseThrow(() -> new RuntimeException("Agent not found: " + hostname));
    }

    @Transactional
    public void markOfflineAfter(Instant threshold) {
        List<Agent> all = repo.findAll();
        for (Agent a : all) {
            if (a.getLastSeen().isBefore(threshold) && "online".equals(a.getStatus())) {
                a.setStatus("offline");
                repo.save(a);
                log.info("Marked agent {} offline (last seen {})", a.getHostname(), a.getLastSeen());
            }
        }
    }
}
