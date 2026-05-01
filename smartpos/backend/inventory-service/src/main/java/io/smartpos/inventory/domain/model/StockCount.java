package io.smartpos.inventory.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "stock_counts")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class StockCount {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "ref", nullable = false, unique = true)
    private String ref;

    @Column(name = "warehouse_id", nullable = false) private UUID warehouseId;
    @Column(name = "user_id") private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private StockCountStatus status = StockCountStatus.OPEN;

    @Column(name = "notes")      private String notes;
    @Column(name = "tenant_id")  private UUID tenantId;

    @Column(name = "started_at", nullable = false, updatable = false)
    private Instant startedAt;

    @Column(name = "posted_at")
    private Instant postedAt;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @JoinColumn(name = "count_id")
    @Builder.Default
    private List<StockCountLine> lines = new ArrayList<>();

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        if (startedAt == null) startedAt = Instant.now();
    }
}
