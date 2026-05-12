package io.smartpos.sales.domain.repository;

import io.smartpos.sales.domain.model.CouponUsage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CouponUsageRepository extends JpaRepository<CouponUsage, UUID> {

    long countByCouponId(UUID couponId);
}
