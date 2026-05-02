package io.smartpos.product.infrastructure.config;

import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.BasicPolymorphicTypeValidator;
import com.fasterxml.jackson.databind.jsontype.PolymorphicTypeValidator;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.Map;

/**
 * Per-cache TTLs:
 *   product         — single product JSON by id        (1 h)
 *   product-barcode — barcode → productId+variantId    (1 h, hot POS path)
 *   category / brand / unit — small, read-mostly lists (6 h)
 *
 * The entries are evicted explicitly on writes (see @CacheEvict in services).
 */
@Configuration
public class RedisCacheConfig {

    public static final String CACHE_PRODUCT  = "product";
    public static final String CACHE_BARCODE  = "product-barcode";
    public static final String CACHE_CATEGORY = "category";
    public static final String CACHE_BRAND    = "brand";
    public static final String CACHE_UNIT     = "unit";

    @Bean
    public RedisCacheManager cacheManager(RedisConnectionFactory cf) {
        // Build a fresh ObjectMapper — DO NOT inject and copy the global
        // bean. `ObjectMapper.copy()` keeps enough shared internal state
        // that activating default typing on the copy bleeds into the bean
        // Feign decoders and Spring HttpMessageConverters use, which then
        // fail with `missing type id property '@class'` on every
        // downstream response. See report-service for the same fix.
        //
        // EVERYTHING typing emits @class for every value — top-level
        // included — so DTOs (and their final record fields) round-trip
        // back to concrete types when Spring Cache reads them as Object.
        PolymorphicTypeValidator ptv = BasicPolymorphicTypeValidator.builder()
                .allowIfBaseType(Object.class)
                .build();
        ObjectMapper cacheMapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
                .activateDefaultTyping(ptv, ObjectMapper.DefaultTyping.EVERYTHING, JsonTypeInfo.As.PROPERTY);
        GenericJackson2JsonRedisSerializer valueSer = new GenericJackson2JsonRedisSerializer(cacheMapper);

        RedisCacheConfiguration base = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofHours(1))
                .disableCachingNullValues()
                .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(valueSer));

        return RedisCacheManager.builder(cf)
                .cacheDefaults(base)
                .withInitialCacheConfigurations(Map.of(
                        CACHE_PRODUCT,  base.entryTtl(Duration.ofHours(1)),
                        CACHE_BARCODE,  base.entryTtl(Duration.ofHours(1)),
                        CACHE_CATEGORY, base.entryTtl(Duration.ofHours(6)),
                        CACHE_BRAND,    base.entryTtl(Duration.ofHours(6)),
                        CACHE_UNIT,     base.entryTtl(Duration.ofHours(6))
                ))
                .build();
    }
}
