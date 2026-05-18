package io.smartpos.payment.infrastructure.config;

import io.smartpos.payment.domain.model.Account;
import io.smartpos.payment.domain.model.AccountType;
import io.smartpos.payment.domain.repository.AccountRepository;
import io.smartpos.payment.domain.repository.ChartOfAccountRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Seeds a default CASH account on an empty DB.
 * Links it to the COA "Cash on Hand" (code 1100) if available.
 */
@Slf4j
@Configuration
public class AccountsBootstrap {

    @Bean
    public ApplicationRunner seedCashAccount(
            AccountRepository accountRepo,
            ChartOfAccountRepository coaRepo,
            @Value("${smartpos.payment.bootstrap.seed-cash-account:true}") boolean seed,
            @Value("${smartpos.payment.default-currency:TZS}") String currency) {
        return args -> {
            if (!seed || accountRepo.count() > 0) return;

            Account.AccountBuilder builder = Account.builder()
                    .name("Cash")
                    .type(AccountType.CASH)
                    .currency(currency)
                    .active(true);

            // Link to global COA "Cash on Hand" if it exists
            coaRepo.findByCodeAndTenantId("1100", null)
                    .ifPresent(coa -> builder.coaId(coa.getId()));

            Account a = builder.build();
            a = accountRepo.save(a);
            log.info("Seeded default account id={} name=Cash currency={} coaId={}",
                    a.getId(), currency, a.getCoaId());
        };
    }
}
