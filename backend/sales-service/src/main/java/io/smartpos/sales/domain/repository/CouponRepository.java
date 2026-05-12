package io.smartpos.sales.domain.repository;

import io.smartpos.sales.domain.model.Coupon;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CouponRepository extends JpaRepository<Coupon, UUID> {

    Page<Coupon> findByTenantId(UUID tenantId, Pageable pageable);

    Optional<Coupon> findByCode(String code);

    List<Coupon> findByTenantIdAndActiveTrue(UUID tenantId);

    Page<Coupon> findByTenantIdAndActive(UUID tenantId, boolean active, Pageable pageable);
}
