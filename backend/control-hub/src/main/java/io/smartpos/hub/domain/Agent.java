package io.smartpos.hub.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "agents")
@Data
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Agent {
    @Id
    private UUID id;
    @Column(nullable = false, unique = true)
    private String hostname;
    private String ipAddress;
    private String version;
    private Instant firstSeen;
    private Instant lastSeen;
    private String status;

    @PrePersist
    void prePersist() {
        if (id == null) id = UUID.randomUUID();
        if (firstSeen == null) firstSeen = Instant.now();
        if (lastSeen == null) lastSeen = Instant.now();
        if (status == null) status = "online";
    }
}
