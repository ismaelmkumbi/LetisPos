package io.smartpos.payment.domain.repository;

import io.smartpos.payment.domain.model.AccountClass;
import io.smartpos.payment.domain.model.ChartOfAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChartOfAccountRepository extends JpaRepository<ChartOfAccount, UUID> {

    Optional<ChartOfAccount> findByCodeIgnoreCaseAndTenantId(String code, UUID tenantId);

    Optional<ChartOfAccount> findByCodeAndTenantId(String code, UUID tenantId);

    boolean existsByCodeIgnoreCaseAndTenantId(String code, UUID tenantId);

    List<ChartOfAccount> findByAccountClassAndTenantIdOrderByCodeAsc(AccountClass accountClass, UUID tenantId);

    List<ChartOfAccount> findByActiveTrueAndTenantIdOrderByCodeAsc(UUID tenantId);

    List<ChartOfAccount> findByActiveFalseAndTenantIdOrderByCodeAsc(UUID tenantId);

    List<ChartOfAccount> findByTenantId(UUID tenantId);

    List<ChartOfAccount> findByTenantIdOrderByCodeAsc(UUID tenantId);
}
