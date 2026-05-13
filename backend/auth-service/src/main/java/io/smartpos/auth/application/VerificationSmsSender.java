package io.smartpos.auth.application;

public interface VerificationSmsSender {
    void sendVerificationSms(String to, String messageBody);
}
