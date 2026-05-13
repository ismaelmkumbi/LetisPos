package io.smartpos.auth.infrastructure.email;

import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.util.StreamUtils;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
public class EmailTemplateService {

    private static final String BASE_PATH = "email-templates/";
    private static final Pattern VAR_PATTERN = Pattern.compile("\\{\\{(\\w+)\\}\\}");

    private final String baseTemplate;
    private final String ctaButton;

    public EmailTemplateService() {
        this.baseTemplate = load("base.html");
        this.ctaButton = load("cta-button.html");
    }

    /**
     * Renders a complete email by composing the base layout, body template, and CTA.
     *
     * @param bodyTemplate name of the body template file (e.g. "verify-email.html")
     * @param vars         substitution variables
     */
    public String render(String bodyTemplate, Map<String, String> vars) {
        // Copy to mutable map so we can add layout vars
        Map<String, String> ctx = new HashMap<>(vars);
        String body = load(bodyTemplate);

        // Compose CTA block if cta_text and cta_url are provided
        String ctaBlock = "";
        if (ctx.containsKey("cta_text") && ctx.containsKey("cta_url")) {
            ctaBlock = replace(ctaButton, ctx);
        }

        // Render body with variables
        String renderedBody = replace(body, ctx);

        // Compose into base layout
        ctx.put("body", renderedBody);
        ctx.put("cta_block", ctaBlock);

        return replace(baseTemplate, ctx);
    }

    static String replace(String template, Map<String, String> vars) {
        Matcher m = VAR_PATTERN.matcher(template);
        StringBuilder sb = new StringBuilder();
        while (m.find()) {
            String key = m.group(1);
            String value = vars.getOrDefault(key, "");
            m.appendReplacement(sb, Matcher.quoteReplacement(value));
        }
        m.appendTail(sb);
        return sb.toString();
    }

    private String load(String filename) {
        try {
            return StreamUtils.copyToString(
                    new ClassPathResource(BASE_PATH + filename).getInputStream(),
                    StandardCharsets.UTF_8
            );
        } catch (Exception e) {
            log.error("Failed to load email template: {}", filename, e);
            return "";
        }
    }
}
