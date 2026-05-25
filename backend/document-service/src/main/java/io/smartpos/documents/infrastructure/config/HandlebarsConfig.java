package io.smartpos.documents.infrastructure.config;

import com.github.jknack.handlebars.Handlebars;
import com.github.jknack.handlebars.io.ClassPathTemplateLoader;
import com.github.jknack.handlebars.io.TemplateLoader;
import io.smartpos.documents.infrastructure.qr.QRCodeGenerator;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.text.DecimalFormat;

@Slf4j
@Configuration
public class HandlebarsConfig {

    private static final ThreadLocal<DecimalFormat> MONEY_FMT =
            ThreadLocal.withInitial(() -> {
                DecimalFormat df = new DecimalFormat("#,##0.00");
                df.setMaximumFractionDigits(2);
                df.setMinimumFractionDigits(2);
                df.setGroupingUsed(true);
                return df;
            });

    @Bean
    public Handlebars handlebars() {
        TemplateLoader loader = new ClassPathTemplateLoader("/templates", ".hbs");
        Handlebars hbs = new Handlebars(loader);
        registerHelpers(hbs);
        hbs.setPrettyPrint(true);
        return hbs;
    }

    /** Expose for DeliveryService to render email templates with the same engine. */
    public static Handlebars createStandalone() {
        Handlebars hbs = new Handlebars(new ClassPathTemplateLoader("/templates", ".hbs"));
        registerHelpers(hbs);
        return hbs;
    }

    private static void registerHelpers(Handlebars hbs) {
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
        // formatCurrency: renders numbers as "15,600,000.00" — no scientific notation
        hbs.registerHelper("formatCurrency", (context, options) -> {
            if (context == null) return "0.00";
            if (context instanceof Number n) return MONEY_FMT.get().format(n);
            if (context instanceof String s) {
                try { return MONEY_FMT.get().format(Double.parseDouble(s)); }
                catch (NumberFormatException e) { return s; }
            }
            return context.toString();
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
    }
}
