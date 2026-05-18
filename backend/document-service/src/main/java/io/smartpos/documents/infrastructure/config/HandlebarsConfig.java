package io.smartpos.documents.infrastructure.config;

import com.github.jknack.handlebars.Handlebars;
import com.github.jknack.handlebars.io.ClassPathTemplateLoader;
import com.github.jknack.handlebars.io.TemplateLoader;
import io.smartpos.documents.infrastructure.qr.QRCodeGenerator;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;


@Slf4j
@Configuration
public class HandlebarsConfig {

    @Bean
    public Handlebars handlebars() {
        TemplateLoader loader = new ClassPathTemplateLoader("/templates", ".hbs");
        Handlebars hbs = new Handlebars(loader);
        hbs.registerHelper("inc", (context, options) -> {
            if (context instanceof Integer i) return i + 1;
            return 0;
        });
        hbs.registerHelper("eq", (context, options) -> {
            Object p0 = context;
            Object p1 = options.param(0);
            return java.util.Objects.equals(p0, p1);
        });
        hbs.registerHelper("gt", (context, options) -> {
            if (context instanceof Number a && options.param(0) instanceof Number b)
                return a.doubleValue() > b.doubleValue();
            return false;
        });
        QRCodeGenerator qrCodeGenerator = new QRCodeGenerator();
        hbs.registerHelper("qrCode", (context, options) -> {
            try {
                Object qrData = options.context.get("qrData");
                String data = qrData != null ? qrData.toString() : "";
                if (data.isEmpty()) return "";
                return qrCodeGenerator.generateSvg(data, 150);
            } catch (Exception e) {
                return "<!-- QR error -->";
            }
        });

        hbs.setPrettyPrint(true);
        return hbs;
    }

    /** Expose for DeliveryService to render email templates with the same engine. */
    public static Handlebars createStandalone() {
        Handlebars hbs = new Handlebars(new ClassPathTemplateLoader("/templates", ".hbs"));
        hbs.registerHelper("inc", (context, options) -> 0);
        hbs.registerHelper("eq", (c, o) -> java.util.Objects.equals(c, o.param(0)));
        hbs.registerHelper("gt", (c, o) -> c instanceof Number a && o.param(0) instanceof Number b && a.doubleValue() > b.doubleValue());
        return hbs;
    }
}
