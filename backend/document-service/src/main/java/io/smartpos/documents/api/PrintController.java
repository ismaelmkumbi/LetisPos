package io.smartpos.documents.api;

import io.smartpos.documents.application.ThermalPrinterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/print")
@RequiredArgsConstructor
public class PrintController {

    private final ThermalPrinterService printerService;

    @GetMapping("/printers")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> listPrinters() {
        return ResponseEntity.ok(printerService.listPrinters());
    }

    @PostMapping("/thermal")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> printThermal(@RequestBody Map<String, Object> body) {
        String printerId = (String) body.get("printerId");
        @SuppressWarnings("unchecked")
        Map<String, Object> saleData = (Map<String, Object>) body.getOrDefault("saleData", Map.of());
        byte[] commands = printerService.buildReceipt(saleData);
        printerService.printToPrinter(printerId, commands);
        return ResponseEntity.ok(Map.of("status", "printed"));
    }

    @PostMapping("/thermal/test")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, String>> testPrint(@RequestBody Map<String, String> body) {
        String printerId = body.get("printerId");
        printerService.printTestPage(printerId);
        return ResponseEntity.ok(Map.of("status", "test_sent"));
    }
}
