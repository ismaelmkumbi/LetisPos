package io.smartpos.inventory.infrastructure.config;

import io.smartpos.inventory.domain.model.Warehouse;
import io.smartpos.inventory.domain.repository.WarehouseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** Seeds a default "Main" warehouse on an empty database (dev convenience). */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class WarehouseBootstrap {

    @Bean
    public ApplicationRunner seedMainWarehouse(WarehouseRepository repo,
                                               @Value("${smartpos.inventory.bootstrap.seed-main-warehouse:true}") boolean seed) {
        return args -> {
            if (!seed || repo.count() > 0) return;
            Warehouse w = Warehouse.builder()
                    .code("MAIN").name("Main Warehouse")
                    .active(true)
                    .build();
            w = repo.save(w);
            log.warn("Seeded default warehouse id={} code=MAIN", w.getId());
        };
    }
}
