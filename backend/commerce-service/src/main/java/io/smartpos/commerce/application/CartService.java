package io.smartpos.commerce.application;

import io.smartpos.commerce.domain.model.Cart;
import io.smartpos.commerce.domain.model.CartItem;
import io.smartpos.commerce.domain.repository.CartRepository;
import io.smartpos.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class CartService {

    private final CartRepository cartRepository;
    private final RedisTemplate<String, Cart> redisTemplate;

    private static final String CART_KEY_PREFIX = "cart:";
    private static final Duration GUEST_TTL = Duration.ofDays(7);

    @Transactional
    public Cart getOrCreateGuestCart(UUID storeId, String sessionId) {
        UUID tenantId = TenantContext.require();
        // Try DB first
        Optional<Cart> existing = cartRepository.findBySessionIdAndStoreIdAndStatus(sessionId, storeId, "active");
        if (existing.isPresent()) return existing.get();
        // Try Redis
        String redisKey = CART_KEY_PREFIX + sessionId;
        Cart redisCart = redisTemplate.opsForValue().get(redisKey);
        if (redisCart != null) return redisCart;
        // Create new
        Cart cart = Cart.builder()
            .tenantId(tenantId)
            .storeId(storeId)
            .sessionId(sessionId)
            .status("active")
            .items(new ArrayList<>())
            .build();
        redisTemplate.opsForValue().set(redisKey, cart, GUEST_TTL);
        return cart;
    }

    @Transactional
    public Cart addItem(UUID storeId, String sessionId, UUID customerId, UUID productId, String variantData, int quantity, BigDecimal unitPrice) {
        Cart cart = resolveCart(storeId, sessionId, customerId);
        // Check if product already in cart
        Optional<CartItem> existing = cart.getItems().stream()
            .filter(i -> i.getProductId().equals(productId))
            .findFirst();
        if (existing.isPresent()) {
            existing.get().setQuantity(existing.get().getQuantity() + quantity);
        } else {
            CartItem item = CartItem.builder()
                .cart(cart)
                .productId(productId)
                .variantData(variantData)
                .quantity(quantity)
                .unitPrice(unitPrice)
                .build();
            cart.getItems().add(item);
        }
        return persistCart(cart, sessionId, customerId);
    }

    @Transactional
    public Cart updateItemQuantity(UUID storeId, String sessionId, UUID customerId, UUID itemId, int quantity) {
        Cart cart = resolveCart(storeId, sessionId, customerId);
        CartItem item = cart.getItems().stream()
            .filter(i -> i.getId().equals(itemId))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("Cart item not found"));
        if (quantity <= 0) {
            cart.getItems().remove(item);
        } else {
            item.setQuantity(quantity);
        }
        return persistCart(cart, sessionId, customerId);
    }

    @Transactional
    public Cart removeItem(UUID storeId, String sessionId, UUID customerId, UUID itemId) {
        Cart cart = resolveCart(storeId, sessionId, customerId);
        cart.getItems().removeIf(i -> i.getId().equals(itemId));
        return persistCart(cart, sessionId, customerId);
    }

    @Transactional
    public Cart getCart(UUID storeId, String sessionId, UUID customerId) {
        return resolveCart(storeId, sessionId, customerId);
    }

    @Transactional
    public void clearCart(UUID storeId, String sessionId, UUID customerId) {
        if (customerId != null) {
            cartRepository.findByCustomerIdAndStoreIdAndStatus(customerId, storeId, "active")
                .ifPresent(cart -> {
                    cart.setStatus("converted");
                    cartRepository.save(cart);
                });
        }
        if (sessionId != null) {
            redisTemplate.delete(CART_KEY_PREFIX + sessionId);
        }
    }

    @Transactional
    public Cart mergeGuestIntoCustomer(UUID storeId, String sessionId, UUID customerId) {
        Cart guestCart = resolveCart(storeId, sessionId, null);
        Cart customerCart = resolveCart(storeId, null, customerId);
        // Merge: add guest items to customer cart (deduplicate by productId)
        for (CartItem guestItem : guestCart.getItems()) {
            Optional<CartItem> existing = customerCart.getItems().stream()
                .filter(i -> i.getProductId().equals(guestItem.getProductId()))
                .findFirst();
            if (existing.isPresent()) {
                existing.get().setQuantity(existing.get().getQuantity() + guestItem.getQuantity());
            } else {
                guestItem.setCart(customerCart);
                customerCart.getItems().add(guestItem);
            }
        }
        // Clear guest cart
        guestCart.getItems().clear();
        guestCart.setStatus("converted");
        persistCart(guestCart, sessionId, null);
        // Save merged customer cart
        return persistCart(customerCart, null, customerId);
    }

    private Cart resolveCart(UUID storeId, String sessionId, UUID customerId) {
        if (customerId != null) {
            return cartRepository.findByCustomerIdAndStoreIdAndStatus(customerId, storeId, "active")
                .orElseGet(() -> createCustomerCart(storeId, customerId));
        }
        return getOrCreateGuestCart(storeId, sessionId);
    }

    private Cart createCustomerCart(UUID storeId, UUID customerId) {
        UUID tenantId = TenantContext.require();
        Cart cart = Cart.builder()
            .tenantId(tenantId)
            .storeId(storeId)
            .customerId(customerId)
            .status("active")
            .items(new ArrayList<>())
            .build();
        return cartRepository.save(cart);
    }

    private Cart persistCart(Cart cart, String sessionId, UUID customerId) {
        if (customerId != null) {
            return cartRepository.save(cart);
        }
        // Guest: persist to Redis
        redisTemplate.opsForValue().set(CART_KEY_PREFIX + sessionId, cart, GUEST_TTL);
        return cart;
    }
}
