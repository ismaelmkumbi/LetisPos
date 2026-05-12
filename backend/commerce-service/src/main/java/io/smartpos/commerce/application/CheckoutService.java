package io.smartpos.commerce.application;

import io.smartpos.commerce.domain.model.Cart;
import io.smartpos.commerce.domain.model.CartItem;
import io.smartpos.commerce.domain.model.Store;
import io.smartpos.commerce.infrastructure.client.InventoryServiceClient;
import io.smartpos.commerce.infrastructure.client.PaymentServiceClient;
import io.smartpos.commerce.infrastructure.client.SalesServiceClient;
import io.smartpos.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class CheckoutService {

    private final CartService cartService;
    private final StoreService storeService;
    private final SalesServiceClient salesServiceClient;
    private final PaymentServiceClient paymentServiceClient;
    private final InventoryServiceClient inventoryServiceClient;
    private final ShippingZoneService shippingZoneService;

    // Simple in-memory idempotency store (use Redis in production)
    private final ConcurrentHashMap<String, CheckoutResult> idempotencyStore = new ConcurrentHashMap<>();

    @Transactional
    public CheckoutResult checkout(String storeSlug, String sessionId, UUID customerId,
                                    CheckoutRequest req, String idempotencyKey) {
        // Idempotency check
        if (idempotencyKey != null && idempotencyStore.containsKey(idempotencyKey)) {
            return idempotencyStore.get(idempotencyKey);
        }

        UUID tenantId = TenantContext.require();
        Store store = storeService.getBySlug(storeSlug);
        UUID storeId = store.getId();

        // 1. Get and validate cart
        Cart cart = cartService.getCart(storeId, sessionId, customerId);
        if (cart.getItems().isEmpty()) {
            throw new IllegalStateException("Cart is empty");
        }

        // 2. Re-validate stock for all items
        for (CartItem item : cart.getItems()) {
            Map<String, Object> stock = inventoryServiceClient.getStock(item.getProductId(), req.warehouseId);
            int available = stock.containsKey("quantity") ? ((Number) stock.get("quantity")).intValue() : 0;
            if (available < item.getQuantity()) {
                throw new IllegalStateException("Insufficient stock for product " + item.getProductId());
            }
        }

        // 3. Calculate totals
        BigDecimal subtotal = cart.getItems().stream()
            .map(i -> i.getUnitPrice().multiply(BigDecimal.valueOf(i.getQuantity())))
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal shippingCost = BigDecimal.ZERO;
        if (req.shippingMethod != null && shippingZoneService != null) {
            shippingCost = shippingZoneService.calculateRate(storeId, req.shippingAddress);
        }

        BigDecimal taxRate = new BigDecimal("0.10"); // TODO: make configurable
        BigDecimal tax = subtotal.multiply(taxRate);
        BigDecimal total = subtotal.add(shippingCost).add(tax);

        // 4. Reserve inventory
        List<UUID> reservations = new ArrayList<>();
        try {
            for (CartItem item : cart.getItems()) {
                Map<String, Object> result = inventoryServiceClient.reserveStock(
                    item.getProductId(), req.warehouseId, item.getQuantity());
                if (result.containsKey("reservationId")) {
                    reservations.add(UUID.fromString(result.get("reservationId").toString()));
                }
            }

            // 5. Capture payment
            Map<String, Object> paymentRequest = new LinkedHashMap<>();
            paymentRequest.put("amount", total);
            paymentRequest.put("currency", store.getCurrency());
            paymentRequest.put("paymentMethodId", req.paymentMethodId);
            paymentRequest.put("description", "Order from " + store.getName());
            Map<String, Object> paymentResult = paymentServiceClient.capturePayment(paymentRequest);

            // 6. Create order in sales-service
            Map<String, Object> orderRequest = new LinkedHashMap<>();
            orderRequest.put("tenantId", tenantId.toString());
            orderRequest.put("customerId", customerId != null ? customerId.toString() : null);
            orderRequest.put("channel", "ONLINE");
            orderRequest.put("storeId", storeId.toString());
            orderRequest.put("status", "CONFIRMED");
            orderRequest.put("subtotal", subtotal);
            orderRequest.put("shippingCost", shippingCost);
            orderRequest.put("tax", tax);
            orderRequest.put("total", total);
            orderRequest.put("currency", store.getCurrency());
            orderRequest.put("paymentId", paymentResult.get("id"));
            orderRequest.put("shippingAddress", req.shippingAddress);
            orderRequest.put("billingAddress", req.billingAddress);
            orderRequest.put("notes", req.customerNotes);
            orderRequest.put("items", cart.getItems().stream().map(i -> {
                Map<String, Object> li = new LinkedHashMap<>();
                li.put("productId", i.getProductId().toString());
                li.put("name", i.getProductId().toString()); // will be resolved by sales service
                li.put("quantity", i.getQuantity());
                li.put("unitPrice", i.getUnitPrice());
                li.put("lineTotal", i.getUnitPrice().multiply(BigDecimal.valueOf(i.getQuantity())));
                return li;
            }).toList());

            Map<String, Object> orderResult = salesServiceClient.createOrder(orderRequest);

            // 7. Clear cart
            cartService.clearCart(storeId, sessionId, customerId);

            // Build result
            CheckoutResult result = new CheckoutResult(
                UUID.fromString(orderResult.get("id").toString()),
                store.getOrderPrefix() + orderResult.get("orderNumber").toString(),
                "CONFIRMED",
                total,
                store.getCurrency()
            );

            // Store idempotency result
            if (idempotencyKey != null) {
                idempotencyStore.put(idempotencyKey, result);
            }

            return result;

        } catch (Exception e) {
            // Release inventory reservations on failure
            for (UUID reservationId : reservations) {
                try {
                    inventoryServiceClient.releaseReservation(reservationId);
                } catch (Exception ex) {
                    log.error("Failed to release reservation {}: {}", reservationId, ex.getMessage());
                }
            }
            throw new RuntimeException("Checkout failed: " + e.getMessage(), e);
        }
    }

    public record CheckoutRequest(
        UUID warehouseId,
        String paymentMethodId,
        Map<String, Object> shippingAddress,
        Map<String, Object> billingAddress,
        String shippingMethod,
        String customerNotes
    ) {}

    public record CheckoutResult(
        UUID orderId,
        String orderNumber,
        String status,
        BigDecimal total,
        String currency
    ) {}
}
