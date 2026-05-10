package io.smartpos.documents.infrastructure.template;

import com.github.jknack.handlebars.Handlebars;
import com.github.jknack.handlebars.Template;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class TemplateRenderer {

    private final Handlebars handlebars;

    public String render(String templateContent, Map<String, Object> context) throws IOException {
        Template template = handlebars.compileInline(templateContent);
        return template.apply(context);
    }
}
