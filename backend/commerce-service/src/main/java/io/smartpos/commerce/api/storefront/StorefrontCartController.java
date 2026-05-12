package io.smartpos.commerce.api.storefront;

import io.smartpos.commerce.application.CartService;
import io.smartpos.commerce.application.StoreService;
import io.smartpos.common.context.TenantContext;
import io.smartpos.commerce.domain.model.Cart;
import io.smartpos.commerce.domain.model.CartItem;
import io.smartpos.commerce.domain.model.Store;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.*;

@RestController
@RequestMapping("/api/v1/storefront/{slug}")
@RequiredArgsConstructor
public class StorefrontCartController {

    private final StoreService storeService;
    private final CartService cartService;

    private String getSessionId(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie c : cookies) {
                if ("commerce_cart_id".equals(c.getName())) return c.getValue();
            }
        }
        return UUID.randomUUID().toString();
    }

    private UUID getCustomerId(HttpServletRequest request) {
        // Extract customer ID from JWT claims if present (set by SecurityConfig)
        // For MVP, check a request attribute set by a filter
        Object cid = request.getAttribute("customerId");
        return cid != null ? UUID.fromString(cid.toString()) : null;
    }

    @GetMapping("/cart")
    public ResponseEntity<Map<String, Object>> getCart(
        @PathVariable String slug,
        HttpServletRequest request) {
        Store store = storeService.getBySlug(slug);
        TenantContext.set(store.getTenantId());
        Cart cart = cartService.getCart(store.getId(), getSessionId(request), getCustomerId(request));
        return ResponseEntity.ok(cartToMap(cart));
    }

    @PostMapping("/cart/items")
    public ResponseEntity<Map<String, Object>> addItem(
        @PathVariable String slug,
        @RequestBody Map<String, Object> body,
        HttpServletRequest request,
        HttpServletResponse response) {
        Store store = storeService.getBySlug(slug);
        TenantContext.set(store.getTenantId());
        String sessionId = getSessionId(request);
        Cart cart = cartService.addItem(
            store.getId(), sessionId, getCustomerId(request),
            UUID.fromString(body.get("productId").toString()),
            body.containsKey("variantData") ? body.get("variantData").toString() : null,
            body.containsKey("quantity") ? ((Number) body.get("quantity")).intValue() : 1,
            body.containsKey("unitPrice") ? new BigDecimal(body.get("unitPrice").toString()) : BigDecimal.ZERO
        );
        setCartCookie(response, sessionId);
        return ResponseEntity.ok(cartToMap(cart));
    }

    @PutMapping("/cart/items/{itemId}")
    public ResponseEntity<Map<String, Object>> updateItem(
        @PathVariable String slug,
        @PathVariable UUID itemId,
        @RequestBody Map<String, Object> body,
        HttpServletRequest request) {
        Store store = storeService.getBySlug(slug);
        TenantContext.set(store.getTenantId());
        int qty = ((Number) body.get("quantity")).intValue();
        Cart cart = cartService.updateItemQuantity(
            store.getId(), getSessionId(request), getCustomerId(request), itemId, qty);
        return ResponseEntity.ok(cartToMap(cart));
    }

    @DeleteMapping("/cart/items/{itemId}")
    public ResponseEntity<Map<String, Object>> removeItem(
        @PathVariable String slug,
        @PathVariable UUID itemId,
        HttpServletRequest request) {
        Store store = storeService.getBySlug(slug);
        TenantContext.set(store.getTenantId());
        Cart cart = cartService.removeItem(
            store.getId(), getSessionId(request), getCustomerId(request), itemId);
        return ResponseEntity.ok(cartToMap(cart));
    }

    private void setCartCookie(HttpServletResponse response, String sessionId) {
        Cookie cookie = new Cookie("commerce_cart_id", sessionId);
        cookie.setPath("/");
        cookie.setHttpOnly(true);
        cookie.setMaxAge(7 * 24 * 60 * 60); // 7 days
        response.addCookie(cookie);
    }

    private Map<String, Object> cartToMap(Cart cart) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("id", cart.getId().toString());
        map.put("items", cart.getItems().stream().map(i -> {
            Map<String, Object> im = new LinkedHashMap<>();
            im.put("id", i.getId().toString());
            im.put("productId", i.getProductId().toString());
            im.put("variantData", i.getVariantData());
            im.put("quantity", i.getQuantity());
            im.put("unitPrice", i.getUnitPrice());
            im.put("lineTotal", i.getUnitPrice().multiply(BigDecimal.valueOf(i.getQuantity())));
            return im;
        }).toList());
        map.put("subtotal", cart.getItems().stream()
            .map(i -> i.getUnitPrice().multiply(BigDecimal.valueOf(i.getQuantity())))
            .reduce(BigDecimal.ZERO, BigDecimal::add));
        map.put("itemCount", cart.getItems().stream().mapToInt(CartItem::getQuantity).sum());
        return map;
    }
}
