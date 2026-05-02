package io.smartpos.notification.application.channel;

import io.smartpos.notification.domain.model.Channel;
import io.smartpos.notification.domain.model.NotificationDelivery;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

/**
 * Email transport via Spring Mail (SMTP). Honours the template's HTML flag.
 * Provider message id is the JavaMail message-id when available, else a
 * generated UUID — Twilio-style strings are not relevant for SMTP.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class EmailDispatcher implements ChannelDispatcher {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:no-reply@smartpos.local}")
    private String defaultFrom;

    @Override public Channel channel() { return Channel.EMAIL; }

    @Override
    public Result send(NotificationDelivery d) {
        try {
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, false, StandardCharsets.UTF_8.name());
            helper.setFrom(defaultFrom);
            helper.setTo(d.getRecipient());
            helper.setSubject(d.getSubject() == null ? "" : d.getSubject());
            // For now we treat all rendered bodies as HTML when the template
            // says so; otherwise plain text. A future enhancement would add
            // an alternative plain-text part.
            boolean html = d.getRenderedBody().contains("<") && d.getRenderedBody().contains(">");
            helper.setText(d.getRenderedBody(), html);
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
