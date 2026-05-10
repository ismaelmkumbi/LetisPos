package io.smartpos.documents.infrastructure.template;

import com.github.jknack.handlebars.Handlebars;
import com.github.jknack.handlebars.Template;
import io.smartpos.documents.application.TemplateCompiler;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class TemplateRenderer {

    private final Handlebars handlebars;
    private final TemplateCompiler compiler;

    public String render(String templateContent, Map<String, Object> context) throws IOException {
        String html = compiler.compile(templateContent);
        Template template = handlebars.compileInline(html);
        return template.apply(context);
    }
}
