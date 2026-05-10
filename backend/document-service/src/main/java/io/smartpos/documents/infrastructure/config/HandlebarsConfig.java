package io.smartpos.documents.infrastructure.config;

import com.github.jknack.handlebars.Handlebars;
import com.github.jknack.handlebars.io.ClassPathTemplateLoader;
import com.github.jknack.handlebars.io.TemplateLoader;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class HandlebarsConfig {

    @Bean
    public Handlebars handlebars() {
        TemplateLoader loader = new ClassPathTemplateLoader("/templates", ".hbs");
        Handlebars hbs = new Handlebars(loader);
        hbs.setPrettyPrint(true);
        return hbs;
    }
}
