package io.smartpos.commerce.api.storefront;

import io.smartpos.commerce.application.CustomerAddressService;
import io.smartpos.commerce.application.CustomerAuthService;
import io.smartpos.commerce.application.StoreService;
import io.smartpos.commerce.domain.model.Customer;
import io.smartpos.commerce.domain.model.CustomerAddress;
import io.smartpos.commerce.domain.model.Store;
import io.smartpos.commerce.infrastructure.client.SalesServiceClient;
import io.smartpos.common.context.TenantContext;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1/storefront/{slug}/customers")
@RequiredArgsConstructor
public class StorefrontCustomerController {

    private final StoreService storeService;
    private final CustomerAuthService authService;
    private final CustomerAddressService addressService;
    private final SalesServiceClient salesServiceClient;

    // ---- Auth helpers ----

    private Store resolveStore(String slug) {
        Store store = storeService.getBySlug(slug);
        TenantContext.set(store.getTenantId());
        return store;
    }

    /**
     * Extract customer ID from the Authorization Bearer token or X-Customer-Id header.
     * For MVP, parses the simple JWT to extract the customer_id claim.
     */
    private UUID requireCustomerId(HttpServletRequest request) {
        // Check X-Customer-Id header first (for clients that store it)
        String headerCid = request.getHeader("X-Customer-Id");
        if (headerCid != null && !headerCid.isBlank()) {
            return UUID.fromString(headerCid);
        }
        // Parse from Authorization Bearer token
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            String token = authHeader.substring(7);
            try {
                String[] parts = token.split("\\.");
                if (parts.length == 3) {
                    String payloadJson = new String(Base64.getUrlDecoder().decode(parts[1]));
                    // Simple JSON extraction for MVP — avoids pulling in a JSON parser
                    String customerId = extractJsonString(payloadJson, "customer_id");
                    if (customerId != null && !customerId.isEmpty()) {
                        return UUID.fromString(customerId);
                    }
                }
            } catch (Exception e) {
                throw new IllegalArgumentException("Invalid customer token");
            }
        }
        throw new IllegalArgumentException("Customer authentication required");
    }

    private String extractJsonString(String json, String key) {
        String searchKey = "\"" + key + "\":\"";
        int start = json.indexOf(searchKey);
        if (start < 0) return null;
        start += searchKey.length();
        int end = json.indexOf("\"", start);
        if (end < 0) return null;
        return json.substring(start, end);
    }

    private Map<String, Object> customerToMap(Customer c) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", c.getId().toString());
        map.put("email", c.getEmail());
        map.put("firstName", c.getFirstName());
        map.put("lastName", c.getLastName());
        map.put("phone", c.getPhone());
        map.put("createdAt", c.getCreatedAt() != null ? c.getCreatedAt().toString() : null);
        return map;
    }

    private Map<String, Object> addressToMap(CustomerAddress a) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", a.getId().toString());
        map.put("label", a.getLabel());
        map.put("firstName", a.getFirstName());
        map.put("lastName", a.getLastName());
        map.put("line1", a.getLine1());
        map.put("line2", a.getLine2());
        map.put("city", a.getCity());
        map.put("state", a.getState());
        map.put("country", a.getCountry());
        map.put("postalCode", a.getPostalCode());
        map.put("phone", a.getPhone());
        map.put("isDefault", a.isDefault());
        return map;
    }

    // ---- Endpoints ----

    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(
        @PathVariable String slug,
        @RequestBody Map<String, Object> body) {
        Store store = resolveStore(slug);
        String email = (String) body.get("email");
        String password = (String) body.get("password");
        String firstName = (String) body.get("firstName");
        String lastName = (String) body.get("lastName");

        if (email == null || email.isBlank()) throw new IllegalArgumentException("email is required");
        if (password == null || password.isBlank()) throw new IllegalArgumentException("password is required");
        if (firstName == null || firstName.isBlank()) throw new IllegalArgumentException("firstName is required");
        if (lastName == null || lastName.isBlank()) throw new IllegalArgumentException("lastName is required");

        CustomerAuthService.AuthResult result = authService.register(
            store.getId(), email, password, firstName, lastName);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("accessToken", result.accessToken());
        response.put("customerId", result.customerId().toString());
        response.put("name", result.name());
        response.put("email", result.email());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(
        @PathVariable String slug,
        @RequestBody Map<String, Object> body) {
        Store store = resolveStore(slug);
        String email = (String) body.get("email");
        String password = (String) body.get("password");

        if (email == null || email.isBlank()) throw new IllegalArgumentException("email is required");
        if (password == null || password.isBlank()) throw new IllegalArgumentException("password is required");

        CustomerAuthService.AuthResult result = authService.login(
            store.getId(), email, password);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("accessToken", result.accessToken());
        response.put("customerId", result.customerId().toString());
        response.put("name", result.name());
        response.put("email", result.email());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getProfile(
        @PathVariable String slug,
        HttpServletRequest request) {
        Store store = resolveStore(slug);
        UUID customerId = requireCustomerId(request);
        Customer customer = authService.getCustomer(customerId);
        if (!customer.getStoreId().equals(store.getId())) {
            throw new IllegalArgumentException("Customer does not belong to this store");
        }
        return ResponseEntity.ok(customerToMap(customer));
    }

    @PutMapping("/me")
    public ResponseEntity<Map<String, Object>> updateProfile(
        @PathVariable String slug,
        @RequestBody Map<String, Object> body,
        HttpServletRequest request) {
        Store store = resolveStore(slug);
        UUID customerId = requireCustomerId(request);
        Customer customer = authService.updateProfile(
            customerId,
            (String) body.get("firstName"),
            (String) body.get("lastName"),
            (String) body.get("phone"));
        return ResponseEntity.ok(customerToMap(customer));
    }

    @GetMapping("/me/orders")
    public ResponseEntity<Map<String, Object>> getOrders(
        @PathVariable String slug,
        HttpServletRequest request,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size) {
        resolveStore(slug);
        UUID customerId = requireCustomerId(request);
        Map<String, Object> result = salesServiceClient.getOrdersByCustomer(customerId, page, size);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/me/addresses")
    public ResponseEntity<List<Map<String, Object>>> getAddresses(
        @PathVariable String slug,
        HttpServletRequest request) {
        resolveStore(slug);
        UUID customerId = requireCustomerId(request);
        List<CustomerAddress> addresses = addressService.getAddresses(customerId);
        return ResponseEntity.ok(addresses.stream().map(this::addressToMap).toList());
    }

    @PostMapping("/me/addresses")
    public ResponseEntity<Map<String, Object>> addAddress(
        @PathVariable String slug,
        @RequestBody Map<String, Object> body,
        HttpServletRequest request) {
        Store store = resolveStore(slug);
        UUID customerId = requireCustomerId(request);
        UUID tenantId = TenantContext.require();

        String label = body.get("label") != null ? body.get("label").toString() : "Home";
        String firstName = (String) body.get("firstName");
        String lastName = (String) body.get("lastName");
        String line1 = (String) body.get("line1");
        String line2 = (String) body.get("line2");
        String city = (String) body.get("city");
        String state = (String) body.get("state");
        String country = (String) body.get("country");
        String postalCode = (String) body.get("postalCode");
        String phone = (String) body.get("phone");
        boolean isDefault = body.get("isDefault") instanceof Boolean b && b;

        if (firstName == null || firstName.isBlank()) throw new IllegalArgumentException("firstName is required");
        if (lastName == null || lastName.isBlank()) throw new IllegalArgumentException("lastName is required");
        if (line1 == null || line1.isBlank()) throw new IllegalArgumentException("line1 is required");
        if (city == null || city.isBlank()) throw new IllegalArgumentException("city is required");
        if (country == null || country.isBlank()) throw new IllegalArgumentException("country is required");
        if (postalCode == null || postalCode.isBlank()) throw new IllegalArgumentException("postalCode is required");

        CustomerAddress address = addressService.addAddress(
            tenantId, store.getId(), customerId, label,
            firstName, lastName, line1, line2, city, state,
            country, postalCode, phone, isDefault);
        return ResponseEntity.ok(addressToMap(address));
    }

    @PutMapping("/me/addresses/{addressId}")
    public ResponseEntity<Map<String, Object>> updateAddress(
        @PathVariable String slug,
        @PathVariable UUID addressId,
        @RequestBody Map<String, Object> body,
        HttpServletRequest request) {
        resolveStore(slug);
        UUID customerId = requireCustomerId(request);

        Boolean isDefault = body.containsKey("isDefault") ?
            (body.get("isDefault") instanceof Boolean b && b) : null;

        CustomerAddress address = addressService.updateAddress(
            addressId, customerId,
            body.get("label") != null ? body.get("label").toString() : null,
            (String) body.get("firstName"),
            (String) body.get("lastName"),
            (String) body.get("line1"),
            (String) body.get("line2"),
            (String) body.get("city"),
            (String) body.get("state"),
            (String) body.get("country"),
            (String) body.get("postalCode"),
            (String) body.get("phone"),
            isDefault);
        return ResponseEntity.ok(addressToMap(address));
    }

    @DeleteMapping("/me/addresses/{addressId}")
    public ResponseEntity<Map<String, Object>> deleteAddress(
        @PathVariable String slug,
        @PathVariable UUID addressId,
        HttpServletRequest request) {
        resolveStore(slug);
        UUID customerId = requireCustomerId(request);
        addressService.deleteAddress(addressId, customerId);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("deleted", true);
        return ResponseEntity.ok(response);
    }
}
