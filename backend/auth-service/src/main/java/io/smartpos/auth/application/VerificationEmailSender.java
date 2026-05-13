package io.smartpos.auth.application;

public interface VerificationEmailSender {
    void sendVerificationEmail(String to, String subject, String htmlBody);
}
