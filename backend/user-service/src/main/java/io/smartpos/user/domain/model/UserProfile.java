package io.smartpos.user.domain.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.Instant;
import java.util.*;

@Entity
@Table(name = "user_profiles")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class UserProfile {

    @Id
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;                // same UUID as auth_db.users.id

    @Column(name = "email", nullable = false, columnDefinition = "citext")
    private String email;

    @Column(name = "first_name") private String firstName;
    @Column(name = "last_name")  private String lastName;
    @Column(name = "phone")      private String phone;
    @Column(name = "avatar_url") private String avatarUrl;
    @Column(name = "address")    private String address;
    @Column(name = "city")       private String city;
    @Column(name = "country")    private String country;

    @Column(name = "is_all_warehouses", nullable = false)
    @Builder.Default
    private boolean allWarehouses = false;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "tenant_id") private UUID tenantId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "user_roles",
            joinColumns        = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id"))
    @Builder.Default
    private Set<Role> roles = new HashSet<>();

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "user_warehouses", joinColumns = @JoinColumn(name = "user_id"))
    @Column(name = "warehouse_id")
    @Builder.Default
    private Set<UUID> warehouseIds = new HashSet<>();

    @CreatedBy
    @Column(name = "created_by", length = 200, updatable = false)
    private String createdBy;

    @LastModifiedBy
    @Column(name = "last_modified_by", length = 200)
    private String lastModifiedBy;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() { updatedAt = Instant.now(); }
}
