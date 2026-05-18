package io.smartpos.notification.application.channel;

import io.smartpos.notification.domain.model.Channel;
import io.smartpos.notification.domain.model.NotificationDelivery;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.util.ByteArrayDataSource;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class EmailDispatcher implements ChannelDispatcher {

    private final JavaMailSender mailSender;

    @Value("${smartpos.notification.from-address:noreply@send.letispos.com}")
    private String defaultFrom;

    @Override public Channel channel() { return Channel.EMAIL; }

    @Override
    public Result send(NotificationDelivery d) {
        try {
            boolean html = d.getRenderedBody().contains("<") && d.getRenderedBody().contains(">");
            boolean hasAttachment = d.getPayloadMeta() != null
                    && d.getPayloadMeta().get("_attachmentBase64") instanceof String b64
                    && !b64.isBlank();

            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, hasAttachment, StandardCharsets.UTF_8.name());
            helper.setFrom(defaultFrom);
            helper.setTo(d.getRecipient());
            helper.setSubject(d.getSubject() == null ? "" : d.getSubject());
            helper.setText(d.getRenderedBody(), html);

            if (hasAttachment) {
                String b64 = (String) d.getPayloadMeta().get("_attachmentBase64");
                String name = d.getPayloadMeta().getOrDefault("_attachmentName", "document.pdf").toString();
                byte[] bytes = Base64.getDecoder().decode(b64);
                helper.addAttachment(name, new ByteArrayDataSource(bytes, "application/pdf"));
            }

            mailSender.send(msg);
            String providerId = msg.getMessageID() != null ? msg.getMessageID() : UUID.randomUUID().toString();
            return Result.ok(providerId);
        } catch (MessagingException e) {
            log.warn("Email build failed for delivery {}: {}", d.getId(), e.getMessage());
            return Result.fail(e.getMessage());
        } catch (Exception e) {
            log.warn("SMTP send failed for delivery {}: {}", d.getId(), e.getMessage());
            return Result.fail(e.getMessage());
        }
    }
}
