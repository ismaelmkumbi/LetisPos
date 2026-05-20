package io.smartpos.commerce.domain.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "stores")
@SQLRestriction("deleted_at IS NULL")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Store {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "tenant_id", nullable = false, unique = true)
    private UUID tenantId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "slug", nullable = false, unique = true)
    private String slug;

    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private String status = "inactive";

    @Column(name = "contact_email")
    private String contactEmail;

    @Column(name = "contact_phone")
    private String contactPhone;

    @Column(name = "address_line1")
    private String addressLine1;

    @Column(name = "address_line2")
    private String addressLine2;

    @Column(name = "city")
    private String city;

    @Column(name = "state")
    private String state;

    @Column(name = "country")
    private String country;

    @Column(name = "postal_code")
    private String postalCode;

    @Column(name = "currency", nullable = false, length = 3)
    @Builder.Default
    private String currency = "TZS";

    @Column(name = "timezone", nullable = false, length = 50)
    @Builder.Default
    private String timezone = "UTC";

    @Column(name = "tax_display", nullable = false, length = 20)
    @Builder.Default
    private String taxDisplay = "exclusive";

    @Column(name = "social_facebook")
    private String socialFacebook;

    @Column(name = "social_instagram")
    private String socialInstagram;

    @Column(name = "social_twitter")
    private String socialTwitter;

    @Column(name = "order_prefix", length = 10)
    @Builder.Default
    private String orderPrefix = "ONL-";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @Column(name = "deleted_at")
    private Instant deletedAt;

    @Version
    @Column(name = "version", nullable = false)
    private long version;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }

    public void softDelete() {
        this.deletedAt = Instant.now();
        this.status = "inactive";
    }

    public boolean isDeleted() { return deletedAt != null; }
}
