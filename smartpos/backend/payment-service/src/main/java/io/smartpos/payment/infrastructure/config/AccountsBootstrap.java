package io.smartpos.payment.infrastructure.config;

import io.smartpos.payment.domain.model.Account;
import io.smartpos.payment.domain.model.AccountType;
import io.smartpos.payment.domain.repository.AccountRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Seeds a default CASH account on an empty DB. */
@Slf4j
@Configuration
public class AccountsBootstrap {

    @Bean
    public ApplicationRunner seedCashAccount(
            AccountRepository repo,
            @Value("${smartpos.payment.bootstrap.seed-cash-account:true}") boolean seed,
            @Value("${smartpos.payment.default-currency:TZS}") String currency) {
        return args -> {
            if (!seed || repo.count() > 0) return;
            Account a = Account.builder()
                    .name("Cash")
                    .type(AccountType.CASH)
                    .currency(currency)
                    .active(true)
                    .build();
            a = repo.save(a);
            log.warn("Seeded default account id={} name=Cash currency={}", a.getId(), currency);
        };
    }
}
