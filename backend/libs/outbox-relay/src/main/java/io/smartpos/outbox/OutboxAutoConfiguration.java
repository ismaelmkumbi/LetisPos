package io.smartpos.outbox;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.kafka.KafkaAutoConfiguration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.core.env.Environment;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.EnableScheduling;

@AutoConfiguration(after = { DataSourceAutoConfiguration.class, KafkaAutoConfiguration.class })
@ConditionalOnProperty(prefix = "smartpos.outbox", name = "enabled", havingValue = "true", matchIfMissing = true)
@ConditionalOnBean(KafkaTemplate.class)
@EnableConfigurationProperties(OutboxProperties.class)
@EnableScheduling
public class OutboxAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public OutboxRelayJob outboxRelayJob(JdbcTemplate jdbc,
                                         KafkaTemplate<String, String> kafka,
                                         OutboxProperties props,
                                         Environment env,
                                         ObjectMapper objectMapper) {
        String serviceName = env.getProperty("spring.application.name", "unknown-service");
        // Make sure Instant serialises as ISO-8601 rather than epoch millis
        ObjectMapper mapper = objectMapper.copy().registerModule(new JavaTimeModule());
        mapper.disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        return new OutboxRelayJob(jdbc, kafka, mapper, props, serviceName);
    }
}
