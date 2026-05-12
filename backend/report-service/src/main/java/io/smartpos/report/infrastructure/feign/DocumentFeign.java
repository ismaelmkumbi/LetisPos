package io.smartpos.report.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.Map;
import java.util.UUID;

/**
 * Feign client for the document-service PDF generation engine.
 * Calls {@code POST /api/v1/documents/generate} to render a Handlebars
 * template with report data and produce a branded PDF stored in MinIO.
 */
@FeignClient(name = "document-service", path = "/api/v1/documents")
public interface DocumentFeign {

    /**
     * Generate a branded report PDF via the document-service template engine.
     *
     * @param req the generation request containing the template key and report data
     * @return a map with {@code id}, {@code presignedUrl}, {@code documentNumber}, etc.
     */
    @PostMapping("/generate")
    Map<String, Object> generateReport(@RequestBody GenerateReportRequest req);

    record GenerateReportRequest(
        /** Template key, e.g. {@code report-sales}, {@code report-financial} */
        String documentType,
        /** Report data passed to the Handlebars template as context */
        Map<String, Object> contextData
    ) {
        public GenerateReportRequest {
            contextData = contextData != null
                ? Map.copyOf(contextData)
                : Map.of();
        }

        /** Convenience factory that prefixes a report key with {@code report-}. */
        public static GenerateReportRequest forReportKey(String reportKey, Map<String, Object> data) {
            return new GenerateReportRequest("report-" + reportKey, data);
        }
    }
}
