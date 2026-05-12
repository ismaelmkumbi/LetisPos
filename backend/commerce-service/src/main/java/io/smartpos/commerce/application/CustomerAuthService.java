package io.smartpos.commerce.application;

import io.smartpos.commerce.domain.model.Customer;
import io.smartpos.commerce.domain.repository.CustomerRepository;
import io.smartpos.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomerAuthService {

    private final CustomerRepository customerRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    @Value("${commerce.customer.jwt-secret:commerce-customer-jwt-secret-change-me}")
    private String jwtSecret;

    @Transactional
    public AuthResult register(UUID storeId, String email, String password, String firstName, String lastName) {
        UUID tenantId = TenantContext.require();
        if (customerRepository.findByStoreIdAndEmail(storeId, email).isPresent()) {
            throw new IllegalArgumentException("Email already registered");
        }
        Customer customer = Customer.builder()
            .tenantId(tenantId)
            .storeId(storeId)
            .email(email)
            .passwordHash(passwordEncoder.encode(password))
            .firstName(firstName)
            .lastName(lastName)
            .build();
        customer = customerRepository.save(customer);
        String token = generateToken(customer);
        return new AuthResult(token, customer.getId(), customer.getFirstName() + " " + customer.getLastName(), customer.getEmail());
    }

    @Transactional(readOnly = true)
    public AuthResult login(UUID storeId, String email, String password) {
        Customer customer = customerRepository.findByStoreIdAndEmail(storeId, email)
            .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));
        if (!passwordEncoder.matches(password, customer.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid email or password");
        }
        String token = generateToken(customer);
        return new AuthResult(token, customer.getId(), customer.getFirstName() + " " + customer.getLastName(), customer.getEmail());
    }

    @Transactional(readOnly = true)
    public Customer getCustomer(UUID customerId) {
        return customerRepository.findById(customerId)
            .orElseThrow(() -> new IllegalArgumentException("Customer not found"));
    }

    @Transactional
    public Customer updateProfile(UUID customerId, String firstName, String lastName, String phone) {
        Customer customer = getCustomer(customerId);
        if (firstName != null) customer.setFirstName(firstName);
        if (lastName != null) customer.setLastName(lastName);
        if (phone != null) customer.setPhone(phone);
        return customerRepository.save(customer);
    }

    private String generateToken(Customer customer) {
        String header = Base64.getUrlEncoder().withoutPadding().encodeToString(
            "{\"alg\":\"HS256\",\"typ\":\"JWT\"}".getBytes(StandardCharsets.UTF_8));
        String payload = Base64.getUrlEncoder().withoutPadding().encodeToString(
            ("{\"sub\":\"" + customer.getId() + "\",\"customer_id\":\"" + customer.getId()
            + "\",\"store_id\":\"" + customer.getStoreId()
            + "\",\"role\":\"CUSTOMER\",\"iat\":" + System.currentTimeMillis() / 1000 + "}")
            .getBytes(StandardCharsets.UTF_8));
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(jwtSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            String signature = Base64.getUrlEncoder().withoutPadding().encodeToString(
                mac.doFinal((header + "." + payload).getBytes(StandardCharsets.UTF_8)));
            return header + "." + payload + "." + signature;
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate token", e);
        }
    }

    public record AuthResult(String accessToken, UUID customerId, String name, String email) {}
}
