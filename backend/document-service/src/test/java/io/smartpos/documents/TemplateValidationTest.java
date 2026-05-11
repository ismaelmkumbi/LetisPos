package io.smartpos.documents;

import com.github.jknack.handlebars.Handlebars;
import io.smartpos.documents.application.TemplateCompiler;
import io.smartpos.documents.infrastructure.config.HandlebarsConfig;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;

import java.io.IOException;
import java.util.*;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThatCode;

@SpringBootTest(classes = {HandlebarsConfig.class, TemplateCompiler.class})
class TemplateValidationTest {

    @Autowired
    private Handlebars handlebars;

    @Autowired
    private TemplateCompiler compiler;

    static Stream<String> templateNames() throws IOException {
        var resolver = new PathMatchingResourcePatternResolver();
        Resource[] resources = resolver.getResources("classpath:templates/*.hbs");
        return Stream.of(resources).map(r -> {
            String filename = r.getFilename();
            return filename != null ? filename.replace(".hbs", "") : "";
        }).filter(name -> !name.isEmpty());
    }

    @ParameterizedTest
    @MethodSource("templateNames")
    void shouldCompileAndRender(String templateName) throws Exception {
        var resource = new PathMatchingResourcePatternResolver()
            .getResource("classpath:templates/" + templateName + ".hbs");
        String content = new String(resource.getInputStream().readAllBytes());
        String html = compiler.compile(content);
        Map<String, Object> sample = createSampleData(templateName);
        assertThatCode(() -> handlebars.compileInline(html).apply(sample))
            .doesNotThrowAnyException();
    }

    private Map<String, Object> createSampleData(String type) {
        Map<String, Object> data = new HashMap<>();
        data.put("company", Map.of(
            "name", "Test Co", "address", "123 St", "tin", "123",
            "phone", "555", "email", "a@b.com", "website", "www.test.co"
        ));
        data.put("document", Map.of(
            "number", "TST-001", "date", "2026-01-01", "status", "draft",
            "dueDate", "2026-02-01", "validUntil", "2026-02-01", "validityDays", "30"
        ));
        data.put("customer", Map.of(
            "name", "Test Customer", "address", "456 Ave", "phone", "777"
        ));
        data.put("supplier", Map.of(
            "name", "Test Supplier", "address", "789 Rd"
        ));
        data.put("items", List.of(Map.of(
            "name", "Product A", "quantity", 2, "unitPrice", "10,000",
            "taxRate", 18, "total", "20,000", "sku", "SKU-001"
        )));
        data.put("totals", Map.of(
            "subtotal", "20,000", "tax", "3,600", "discount", "0",
            "grandTotal", "23,600",
            "taxLines", List.of(Map.of("label", "VAT 18%", "amount", "3,600"))
        ));
        data.put("preparedBy", Map.of("name", "Tester"));
        data.put("fromWarehouse", Map.of("name", "WH-A", "address", "Loc A"));
        data.put("toWarehouse", Map.of("name", "WH-B", "address", "Loc B"));
        data.put("terms", "Standard terms apply.");
        data.put("qrData", "https://verify.test/TST-001");
        data.put("sellerTin", "123-456-789");
        data.put("fiscalCode", "FSC-001");
        data.put("zNumber", "Z-001");
        data.put("receiptNumber", "RCP-001");
        data.put("buyerTin", "987-654-321");
        data.put("watermark", "DRAFT");
        return data;
    }
}
