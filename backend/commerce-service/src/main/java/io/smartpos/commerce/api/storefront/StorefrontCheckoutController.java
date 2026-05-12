package io.smartpos.commerce.api.storefront;

import io.smartpos.commerce.application.CheckoutService;
import io.smartpos.commerce.application.CheckoutService.CheckoutRequest;
import io.smartpos.commerce.application.CheckoutService.CheckoutResult;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1/storefront/{slug}")
@RequiredArgsConstructor
public class StorefrontCheckoutController {

    private final CheckoutService checkoutService;

    private String getSessionId(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie c : cookies) {
                if ("commerce_cart_id".equals(c.getName())) return c.getValue();
            }
        }
        return UUID.randomUUID().toString();
    }

    @PostMapping("/checkout")
    public ResponseEntity<Map<String, Object>> checkout(
        @PathVariable String slug,
        @RequestBody Map<String, Object> body,
        HttpServletRequest request) {
        String idempotencyKey = request.getHeader("Idempotency-Key");
        String sessionId = getSessionId(request);

        @SuppressWarnings("unchecked")
        CheckoutResult result = checkoutService.checkout(
            slug, sessionId, null,
            new CheckoutRequest(
                body.containsKey("warehouseId") ? UUID.fromString(body.get("warehouseId").toString()) : UUID.randomUUID(),
                body.get("paymentMethodId").toString(),
                body.containsKey("shippingAddress") ? (Map<String, Object>) body.get("shippingAddress") : Map.of(),
                body.containsKey("billingAddress") ? (Map<String, Object>) body.get("billingAddress") : Map.of(),
                body.containsKey("shippingMethod") ? body.get("shippingMethod").toString() : null,
                body.containsKey("customerNotes") ? body.get("customerNotes").toString() : null
            ),
            idempotencyKey
        );

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("orderId", result.orderId().toString());
        response.put("orderNumber", result.orderNumber());
        response.put("status", result.status());
        response.put("total", result.total());
        response.put("currency", result.currency());
        return ResponseEntity.ok(response);
    }
}
