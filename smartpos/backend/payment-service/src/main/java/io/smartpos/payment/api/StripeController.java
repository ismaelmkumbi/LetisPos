package io.smartpos.payment.api;

import io.smartpos.payment.api.dto.StripeDto;
import io.smartpos.payment.application.StripeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/payments/stripe")
@RequiredArgsConstructor
public class StripeController {

    private final StripeService stripe;

    /** Client calls this from the POS to get a clientSecret for Stripe.js. */
    @PostMapping("/intent")
    @PreAuthorize("hasAuthority('payment.record') or hasAuthority('pos.use')")
    public StripeDto.IntentResponse intent(@Valid @RequestBody StripeDto.IntentRequest req) {
        return stripe.createPaymentIntent(req);
    }

    /**
     * Stripe webhook receiver. Must be routable without auth — the gateway's
     * {@code SecurityConfig} has this endpoint on its permit-all list.
     *
     * Stripe signs the body with an HMAC — for real mode we verify against
     * {@code smartpos.payment.stripe.webhook-secret} before acting.
     */
    @PostMapping("/webhook")
    public ResponseEntity<Void> webhook(@RequestBody String body,
                                        @RequestHeader(value = "Stripe-Signature", required = false) String sig) {
        stripe.processWebhook(body, sig);
        return ResponseEntity.status(HttpStatus.OK).build();
    }
}
