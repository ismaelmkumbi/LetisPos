package io.smartpos.notification.application.channel;

import io.smartpos.notification.domain.model.Channel;
import io.smartpos.notification.domain.model.NotificationDelivery;

/**
 * Pluggable transport for one channel (email/SMS/WhatsApp).
 * Implementations are wired into a map keyed by {@link #channel()}
 * and chosen by {@code NotificationService} at send time.
 */
public interface ChannelDispatcher {

    Channel channel();

    /**
     * Send the rendered message. Returning {@link Result#ok} marks the
     * delivery SENT; throwing or returning {@link Result#fail} marks it FAILED
     * and schedules a retry.
     */
    Result send(NotificationDelivery delivery);

    record Result(boolean success, String providerMessageId, String errorMessage) {
        public static Result ok(String providerId) { return new Result(true, providerId, null); }
        public static Result fail(String error)    { return new Result(false, null, error); }
    }
}
