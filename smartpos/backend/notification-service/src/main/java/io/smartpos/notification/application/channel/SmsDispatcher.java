package io.smartpos.notification.application.channel;

import io.smartpos.notification.domain.model.Channel;
import io.smartpos.notification.domain.model.NotificationDelivery;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class SmsDispatcher implements ChannelDispatcher {

    private final TwilioClient twilio;
    private final TwilioProperties props;

    @Override public Channel channel() { return Channel.SMS; }

    @Override
    public Result send(NotificationDelivery d) {
        try {
            String sid = twilio.send(props.smsFrom(), d.getRecipient(), d.getRenderedBody());
            return Result.ok(sid);
        } catch (Exception e) {
            log.warn("SMS send failed for delivery {}: {}", d.getId(), e.getMessage());
            return Result.fail(e.getMessage());
        }
    }
}
