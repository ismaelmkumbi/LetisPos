package io.smartpos.commerce.infrastructure.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.client.RestClient;

@Configuration
public class RestClientConfig {

    @Value("${commerce.product-service.base-url:http://localhost:8083}")
    private String productServiceBaseUrl;

    @Value("${commerce.inventory-service.base-url:http://localhost:8084}")
    private String inventoryServiceBaseUrl;

    @Value("${commerce.sales-service.base-url:http://localhost:8085}")
    private String salesServiceBaseUrl;

    @Value("${commerce.payment-service.base-url:http://localhost:8086}")
    private String paymentServiceBaseUrl;

    @Bean
    public RestClient.Builder restClientBuilder() {
        return RestClient.builder();
    }

    @Bean("productServiceRestClient")
    public RestClient productServiceRestClient(RestClient.Builder builder) {
        return builder.baseUrl(productServiceBaseUrl).build();
    }

    @Bean("inventoryServiceRestClient")
    public RestClient inventoryServiceRestClient(RestClient.Builder builder) {
        return builder.baseUrl(inventoryServiceBaseUrl).build();
    }

    @Bean("salesServiceRestClient")
    public RestClient salesServiceRestClient(RestClient.Builder builder) {
        return builder.baseUrl(salesServiceBaseUrl).build();
    }

    @Bean("paymentServiceRestClient")
    public RestClient paymentServiceRestClient(RestClient.Builder builder) {
        return builder.baseUrl(paymentServiceBaseUrl).build();
    }

    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
