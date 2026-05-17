package io.smartpos.report.infrastructure.config;

import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.BasicPolymorphicTypeValidator;
import com.fasterxml.jackson.databind.jsontype.PolymorphicTypeValidator;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import io.smartpos.common.context.TenantContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.Arrays;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

/**
 * Per-cache TTLs for report projections.
 *
 *   dashboard       — KPI JSON for a (tenant, warehouse, period) tuple  —  5 min
 *   sales-summary   — aggregated sales metrics                           —  2 min
 *   top-products    —                                                      5 min
 *   top-customers   —                                                      5 min
 *   inventory       — per-warehouse summary                                 2 min
 *   profit-loss     — heaviest query; computed from multiple Feign calls — 10 min
 */
@Configuration
public class RedisCacheConfig {

    public static final String CACHE_DASHBOARD     = "dashboard";
    public static final String CACHE_SALES_SUMMARY = "sales-summary";
    public static final String CACHE_TOP_PRODUCTS  = "top-products";
    public static final String CACHE_TOP_CUSTOMERS = "top-customers";
    public static final String CACHE_INVENTORY     = "inventory";
    public static final String CACHE_PROFIT_LOSS   = "profit-loss";
    public static final String CACHE_DASHBOARD_EXECUTIVE_SUMMARY = "dashboard-executive-summary";

    public static String tenantKey(Object... parts) {
        return Stream.concat(Stream.of(TenantContext.require()), Arrays.stream(parts))
                .map(part -> part == null ? "all" : part.toString())
                .collect(Collectors.joining(":"));
    }

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory cf) {
        // IMPORTANT: do NOT inject the application ObjectMapper bean and
        // mutate it via .copy() — `ObjectMapper.copy()` shares enough
        // internal state that activating default typing on the "copy" leaks
        // back into the bean Feign decoders use, breaking every downstream
        // response with `missing type id property '@class'`. Build a fresh
        // ObjectMapper dedicated to the cache.
        //
        // EVERYTHING typing forces an "@class" hint on every value (top-
        // level included), so DashboardDto and its nested record fields
        // round-trip back to the right concrete classes when Spring Cache
        // reads them as Object.
        PolymorphicTypeValidator ptv = BasicPolymorphicTypeValidator.builder()
                .allowIfBaseType(Object.class)
                .build();
        ObjectMapper cacheMapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
                .activateDefaultTyping(ptv, ObjectMapper.DefaultTyping.EVERYTHING, JsonTypeInfo.As.PROPERTY);
        GenericJackson2JsonRedisSerializer valueSer = new GenericJackson2JsonRedisSerializer(cacheMapper);

        RedisCacheConfiguration base = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(5))
                .disableCachingNullValues()
                .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(valueSer));

        return RedisCacheManager.builder(cf)
                .cacheDefaults(base)
                .withInitialCacheConfigurations(Map.of(
                        CACHE_DASHBOARD,     base.entryTtl(Duration.ofMinutes(5)),
                        CACHE_SALES_SUMMARY, base.entryTtl(Duration.ofMinutes(2)),
                        CACHE_TOP_PRODUCTS,  base.entryTtl(Duration.ofMinutes(5)),
                        CACHE_TOP_CUSTOMERS, base.entryTtl(Duration.ofMinutes(5)),
                        CACHE_INVENTORY,     base.entryTtl(Duration.ofMinutes(2)),
                        CACHE_PROFIT_LOSS,   base.entryTtl(Duration.ofMinutes(10)),
                        CACHE_DASHBOARD_EXECUTIVE_SUMMARY, base.entryTtl(Duration.ofHours(1))
                ))
                .build();
    }
}
