package io.smartpos.hrm.domain.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "employees")
@SQLRestriction("deleted_at IS NULL")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Employee {

    @Id @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "code", nullable = false) private String code;
    @Column(name = "user_id")    private UUID userId;
    @Column(name = "first_name", nullable = false) private String firstName;
    @Column(name = "last_name")  private String lastName;
    @Column(name = "email")      private String email;
    @Column(name = "phone")      private String phone;
    @Column(name = "department_id")  private UUID departmentId;
    @Column(name = "designation_id") private UUID designationId;
    @Column(name = "shift_id")       private UUID shiftId;

    @Column(name = "hire_date", nullable = false)
    @Builder.Default
    private LocalDate hireDate = LocalDate.now();

    @Column(name = "end_date") private LocalDate endDate;

    @Column(name = "base_salary", nullable = false)
    @Builder.Default
    private BigDecimal baseSalary = BigDecimal.ZERO;

    @Column(name = "salary_currency", nullable = false, length = 3)
    @Builder.Default
    private String salaryCurrency = "TZS";

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private EmployeeStatus status = EmployeeStatus.ACTIVE;

    @Column(name = "address")    private String address;
    @Column(name = "image_url")  private String imageUrl;
    @Column(name = "notes")      private String notes;
    @Column(name = "tenant_id")  private UUID tenantId;
    @Column(name = "created_at", nullable = false, updatable = false) private Instant createdAt;
    @Column(name = "updated_at", nullable = false) private Instant updatedAt;
    @Column(name = "deleted_at") private Instant deletedAt;

    @PrePersist
    void onCreate() {
        if (id == null) id = UUID.randomUUID();
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        updatedAt = now;
    }
    @PreUpdate void onUpdate() { updatedAt = Instant.now(); }

    public void softDelete() {
        deletedAt = Instant.now();
        status = EmployeeStatus.TERMINATED;
    }
}
