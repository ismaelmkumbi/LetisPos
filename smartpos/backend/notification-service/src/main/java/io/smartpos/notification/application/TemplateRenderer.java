package io.smartpos.notification.application;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Tiny mustache-style renderer: replaces {{name}} with {@code data.get("name")}.
 * Missing keys render as the empty string (matches Stocky's behaviour).
 *
 * Kept deliberately small — Thymeleaf is on the classpath for HTML emails
 * that need conditionals/loops, but most templates only need simple subs.
 */
@Component
public class TemplateRenderer {

    private static final Pattern PLACEHOLDER = Pattern.compile("\\{\\{\\s*([\\w.-]+)\\s*}}");

    public String render(String template, Map<String, Object> data) {
        if (template == null || template.isEmpty()) return "";
        if (data == null || data.isEmpty())          return template;
        Matcher m = PLACEHOLDER.matcher(template);
        StringBuilder out = new StringBuilder();
        while (m.find()) {
            Object value = data.get(m.group(1));
            m.appendReplacement(out, Matcher.quoteReplacement(value == null ? "" : value.toString()));
        }
        m.appendTail(out);
        return out.toString();
    }
}
