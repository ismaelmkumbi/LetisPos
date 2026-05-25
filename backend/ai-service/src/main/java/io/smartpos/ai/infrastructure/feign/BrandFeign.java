package io.smartpos.ai.infrastructure.feign;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Brand identity + AI helpers live in sales-service (where DocumentTheme
 * already sits). The assistant calls them via Feign so a tenant can chat
 * "generate me a palette" / "preview my invoice" without bouncing through
 * a separate UI.
 */
@FeignClient(name = "brand-service",
    url = "${smartpos.ai.sales-service-url:http://localhost:8083}")
public interface BrandFeign {

    // ── BrandProfile CRUD ────────────────────────────────────────────────

    @GetMapping("/api/v1/brand/profile")
    Map<String, Object> getBrand();

    @PutMapping("/api/v1/brand/profile")
    Map<String, Object> updateBrand(@RequestBody Map<String, Object> body);

    @PostMapping("/api/v1/brand/profile/reset")
    Map<String, Object> resetBrand();

    // ── BrandAi (existing endpoints) ─────────────────────────────────────

    @PostMapping("/api/v1/brand/ai/chat")
    Map<String, Object> brandChat(@RequestBody Map<String, Object> body);

    @PostMapping("/api/v1/brand/ai/generate-variants")
    List<Map<String, Object>> generateLogoVariants();

    @PostMapping("/api/v1/brand/ai/generate-palette")
    Map<String, Object> generatePalette();

    @PostMapping("/api/v1/brand/ai/suggest-fonts")
    Map<String, Object> suggestFonts();

    @PostMapping("/api/v1/brand/ai/generate-theme")
    Map<String, Object> generateTheme();

    // ── DocumentTheme CRUD ───────────────────────────────────────────────

    @GetMapping("/api/v1/brand/document-themes")
    List<Map<String, Object>> listThemes();

    @PutMapping("/api/v1/brand/document-themes")
    List<Map<String, Object>> saveThemes(@RequestBody List<Map<String, Object>> themes);

    // ── Mock preview (new endpoint added in this round) ─────────────────

    @PostMapping("/api/v1/brand/document-themes/preview-mock")
    Map<String, Object> previewMock(@RequestBody Map<String, Object> body);

    // ── Job polling for async image gen ──────────────────────────────────

    @GetMapping("/api/v1/brand/ai/jobs/{jobId}")
    Map<String, Object> getJob(@PathVariable("jobId") UUID jobId);

    @GetMapping("/api/v1/brand/ai/jobs")
    List<Map<String, Object>> listJobs(@RequestParam(value = "status", required = false) String status);
}
