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
        String rendered = template.apply(context);

        // Inject watermark overlay if present in context
        if (context.get("watermark") != null && !context.get("watermark").toString().isEmpty()) {
            String wm = context.get("watermark").toString();
            rendered = rendered.replace("<body>",
                "<body><div style=\"position:fixed;top:50%;left:50%;"
                + "transform:translate(-50%,-50%) rotate(-30deg);"
                + "font-size:80px;color:rgba(0,0,0,0.08);font-weight:900;"
                + "pointer-events:none;z-index:1000;\">" + wm + "</div>");
        }

        return rendered;
    }
}
