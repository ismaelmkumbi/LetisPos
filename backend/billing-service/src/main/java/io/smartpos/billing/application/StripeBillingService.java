package io.smartpos.billing.application;

import com.stripe.Stripe;
import com.stripe.model.checkout.Session;
import com.stripe.param.checkout.SessionCreateParams;
import io.smartpos.billing.infrastructure.stripe.StripeProperties;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class StripeBillingService {

    private final StripeProperties stripeProperties;

    @PostConstruct
    void init() {
        if (stripeProperties.enabled()) {
            Stripe.apiKey = stripeProperties.secretKey();
        }
    }

    public String createCheckoutSession(
            UUID tenantId, UUID subscriptionId,
            String planCode, String billingCycle,
            long amountTzs, String successUrl, String cancelUrl) {

        if (!stripeProperties.enabled()) {
            // Return a mock checkout URL for development
            String mockSessionId = "cs_mock_" + UUID.randomUUID().toString().replace("-", "").substring(0, 8);
            log.info("Mock Stripe checkout: sessionId={}, tenant={}, plan={}, amount={}",
                mockSessionId, tenantId, planCode, amountTzs);
            return successUrl + "?session_id=" + mockSessionId;
        }

        try {
            SessionCreateParams params = SessionCreateParams.builder()
                .setMode(SessionCreateParams.Mode.SUBSCRIPTION)
                .setSuccessUrl(successUrl)
                .setCancelUrl(cancelUrl)
                .setClientReferenceId(subscriptionId.toString())
                .putMetadata("tenantId", tenantId.toString())
                .putMetadata("planCode", planCode)
                .putMetadata("billingCycle", billingCycle)
                .addLineItem(
                    SessionCreateParams.LineItem.builder()
                        .setPrice(getPriceId(planCode, billingCycle))
                        .setQuantity(1L)
                        .build()
                )
                .build();

            Session session = Session.create(params);
            return session.getUrl();
        } catch (Exception e) {
            log.error("Failed to create Stripe checkout session", e);
            throw new RuntimeException("Payment service unavailable", e);
        }
    }

    private String getPriceId(String planCode, String billingCycle) {
        boolean annual = "ANNUAL".equals(billingCycle);
        return switch (planCode) {
            case "STARTER" -> annual ? stripeProperties.priceStarterAnnual() : stripeProperties.priceStarterMonthly();
            case "BUSINESS" -> annual ? stripeProperties.priceBusinessAnnual() : stripeProperties.priceBusinessMonthly();
            case "PROFESSIONAL" -> annual ? stripeProperties.priceProfessionalAnnual() : stripeProperties.priceProfessionalMonthly();
            case "ENTERPRISE" -> stripeProperties.priceEnterpriseMonthly();
            default -> throw new IllegalArgumentException("Unknown plan: " + planCode);
        };
    }
}
