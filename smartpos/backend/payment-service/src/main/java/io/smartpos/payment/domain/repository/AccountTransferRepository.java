package io.smartpos.payment.domain.repository;

import io.smartpos.payment.domain.model.AccountTransfer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface AccountTransferRepository extends JpaRepository<AccountTransfer, UUID> {
    long countByRefStartingWith(String prefix);
}
