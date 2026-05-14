package io.smartpos.auth.infrastructure.email;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class EmailTemplateServiceTest {

    private final EmailTemplateService templateService = new EmailTemplateService();

    @Test
    void rendersGmailSafeHostedLogoInsteadOfInlineSvg() {
        String html = templateService.render("verify-email.html", Map.of(
                "heading", "Verify your email",
                "subheading", "Secure your workspace",
                "expiry_hours", "24",
                "verify_url", "https://letispos.com/verify/example",
                "cta_text", "Verify email",
                "cta_url", "https://letispos.com/verify/example",
                "footer_text", "Letis POS",
                "legal", "You received this because you created a workspace."
        ));

        assertThat(html).contains("<img src=\"https://letispos.com/email-logo.png\"");
        assertThat(html).doesNotContain("<svg");
        assertThat(html).doesNotContain("{{logo_url}}");
    }
}
