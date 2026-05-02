package io.smartpos.notification.application.channel;

import io.smartpos.notification.domain.model.Channel;
import io.smartpos.notification.domain.model.NotificationDelivery;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class WhatsAppDispatcher implements ChannelDispatcher {

    private final TwilioClient twilio;
    private final TwilioProperties props;

    @Override public Channel channel() { return Channel.WHATSAPP; }

    @Override
    public Result send(NotificationDelivery d) {
        try {
            // WhatsApp via Twilio expects "whatsapp:+E164" on both ends.
            String to = d.getRecipient().startsWith("whatsapp:") ? d.getRecipient()
                                                                 : "whatsapp:" + d.getRecipient();
            String sid = twilio.send(props.whatsappFrom(), to, d.getRenderedBody());
            return Result.ok(sid);
        } catch (Exception e) {
            log.warn("WhatsApp send failed for delivery {}: {}", d.getId(), e.getMessage());
            return Result.fail(e.getMessage());
        }
    }
}
