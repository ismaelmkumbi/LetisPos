package io.smartpos.product.domain.repository;

import io.smartpos.product.domain.model.PriceList;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.UUID;

public interface PriceListRepository extends JpaRepository<PriceList, UUID>, JpaSpecificationExecutor<PriceList> {
}
