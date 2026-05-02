package io.smartpos.payment.domain.repository;

import io.smartpos.payment.domain.model.AccountClass;
import io.smartpos.payment.domain.model.ChartOfAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChartOfAccountRepository extends JpaRepository<ChartOfAccount, UUID> {

    Optional<ChartOfAccount> findByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCase(String code);

    List<ChartOfAccount> findByAccountClassOrderByCodeAsc(AccountClass accountClass);

    List<ChartOfAccount> findByActiveTrueOrderByCodeAsc();
}
