package io.smartpos.inventory.domain.repository;

import io.smartpos.inventory.domain.model.SupplierReturn;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.UUID;

public interface SupplierReturnRepository extends JpaRepository<SupplierReturn, UUID>,
        JpaSpecificationExecutor<SupplierReturn> {

    long countByRefStartingWith(String prefix);
}
