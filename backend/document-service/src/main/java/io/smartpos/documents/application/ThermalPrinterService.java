package io.smartpos.documents.application;

import io.smartpos.documents.infrastructure.thermal.ThermalCommandBuilder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Service;

import java.io.OutputStream;
import java.net.Socket;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ThermalPrinterService {

    private final PrinterConfigs printerConfigs;

    // --- Public API ---

    /** List all enabled printer configurations */
    public List<PrinterInfo> listPrinters() {
        return printerConfigs.getPrinters().stream()
                .filter(p -> p.isEnabled())
                .map(p -> new PrinterInfo(p.getId(), p.getName(), p.getPaperWidth(), p.isAutoCut(), p.isCashDrawer()))
                .collect(Collectors.toList());
    }

    /** Build a full ESC/POS receipt command sequence for the given sale data */
    public byte[] buildReceipt(Map<String, Object> saleData) {
        ThermalCommandBuilder cb = new ThermalCommandBuilder();
        cb.initialize();

        String storeName = getString(saleData, "storeName", "LetisPos Store");
        String storeAddress = getString(saleData, "storeAddress", "Dar es Salaam, Tanzania");
        String storeTin = getString(saleData, "storeTin", "123-456-789");
        String ref = getString(saleData, "reference", "SALE-001");
        String customer = getString(saleData, "customer", "Walk-In");
        boolean showQr = (boolean) saleData.getOrDefault("showQr", true);

        String dateStr = saleData.containsKey("date")
                ? getString(saleData, "date", "")
                : LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));

        // --- Header ---
        cb.centerText(storeName);
        cb.centerText(storeAddress);
        cb.centerText("TIN: " + storeTin);
        cb.line();

        // --- Sale info ---
        cb.text("Ref: " + ref);
        cb.text("Date: " + dateStr);
        cb.text("Customer: " + customer);
        cb.line();

        // --- Column header ---
        cb.text("Item                       Qty  Price    Total");
        cb.line();

        // --- Line items ---
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> items = (List<Map<String, Object>>) saleData.getOrDefault("items", List.of());
        double subtotal = 0;
        NumberFormat nf = NumberFormat.getNumberInstance(Locale.US);
        nf.setMinimumFractionDigits(2);
        nf.setMaximumFractionDigits(2);

        for (var item : items) {
            String name = getString(item, "name", "Item");
            int qty = getInt(item, "quantity", 1);
            double price = getDouble(item, "price", 0.0);
            double total = qty * price;
            subtotal += total;

            cb.text(name);
            cb.text("  " + qty + " x " + nf.format(price) + " = " + nf.format(total));
        }

        cb.line();

        String currency = getString(saleData, "currency", "TZS");

        // --- Totals ---
        cb.align(2);
        cb.text("Subtotal: " + nf.format(subtotal));

        double taxRate = getDouble(saleData, "taxRate", 0.18);
        double taxAmount = subtotal * taxRate;
        if (taxRate > 0) {
            cb.align(2);
            cb.text("Tax (" + Math.round(taxRate * 100) + "%): " + nf.format(taxAmount));
        }

        double grandTotal = subtotal + taxAmount;
        cb.align(2);
        cb.boldText("GRAND TOTAL: " + nf.format(grandTotal));
        cb.align(0);

        cb.line();

        // --- Payment ---
        double paid = getDouble(saleData, "paid", grandTotal);
        double change = paid - grandTotal;
        String paymentMethod = getString(saleData, "paymentMethod", "Cash");

        cb.align(2);
        cb.text("Paid (" + paymentMethod + "): " + nf.format(paid));
        if (change > 0) {
            cb.align(2);
            cb.text("Change: " + nf.format(change));
        }
        cb.align(0);

        cb.line();

        // --- Footer ---
        cb.centerText("Thank You For Shopping");

        // --- QR Code ---
        if (showQr) {
            String qrData = getString(saleData, "qrData", "https://receipts.letispos.com/" + ref);
            cb.centerText("Scan to get digital receipt");
            cb.align(1);
            cb.qrCode(qrData, 6);
            cb.align(0);
        }

        // --- Final actions ---
        cb.feedLines(3);
        cb.partialCut();

        return cb.build();
    }

    /** Send raw ESC/POS commands to a printer by ID via TCP socket */
    public void printToPrinter(String printerId, byte[] commands) {
        PrinterConfig cfg = resolvePrinter(printerId);
        try (Socket socket = new Socket(cfg.getIp(), cfg.getPort());
             OutputStream out = socket.getOutputStream()) {
            out.write(commands);
            out.flush();
            log.info("Printed {} bytes to printer '{}' at {}:{}",
                    commands.length, printerId, cfg.getIp(), cfg.getPort());
        } catch (Exception e) {
            log.error("Failed to print to printer '{}': {}", printerId, e.getMessage(), e);
            throw new RuntimeException("Failed to print to printer: " + e.getMessage(), e);
        }
    }

    /** Print a test page to the given printer */
    public void printTestPage(String printerId) {
        ThermalCommandBuilder cb = new ThermalCommandBuilder();
        cb.initialize();
        cb.doubleSizeText("TEST PRINT");
        cb.emptyLine();
        cb.text("Printer: " + printerId);
        cb.text("Date: " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        cb.emptyLine();
        cb.text("If you can read this, the printer");
        cb.text("is configured correctly.");
        cb.emptyLine();
        cb.boldText("ESC/POS commands working OK");
        cb.emptyLine();
        cb.line();
        cb.centerText("End of Test Page");
        cb.feedLines(3);
        cb.partialCut();
        printToPrinter(printerId, cb.build());
    }

    // --- Private helpers ---

    private PrinterConfig resolvePrinter(String printerId) {
        if (printerId == null || printerId.isBlank()) {
            // default to first enabled printer
            Optional<PrinterConfig> first = printerConfigs.getPrinters().stream()
                    .filter(PrinterConfig::isEnabled)
                    .findFirst();
            if (first.isPresent()) return first.get();
            throw new IllegalArgumentException("No enabled printers configured");
        }
        return printerConfigs.getPrinters().stream()
                .filter(p -> p.getId().equals(printerId) && p.isEnabled())
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Printer not found or disabled: " + printerId));
    }

    @SuppressWarnings("unchecked")
    private String getString(Map<String, Object> map, String key, String defaultVal) {
        Object val = map.get(key);
        return val != null ? val.toString() : defaultVal;
    }

    private int getInt(Map<String, Object> map, String key, int defaultVal) {
        Object val = map.get(key);
        if (val instanceof Number n) return n.intValue();
        if (val instanceof String s) return Integer.parseInt(s);
        return defaultVal;
    }

    private double getDouble(Map<String, Object> map, String key, double defaultVal) {
        Object val = map.get(key);
        if (val instanceof Number n) return n.doubleValue();
        if (val instanceof String s) return Double.parseDouble(s);
        return defaultVal;
    }

    // --- Configuration classes ---

    @Data
    @Component
    @ConfigurationProperties(prefix = "smartpos")
    public static class PrinterConfigs {
        private List<PrinterConfig> printers = new ArrayList<>();
    }

    @Data
    public static class PrinterConfig {
        private String id;
        private String name;
        private String ip;
        private int port = 9100;
        private int paperWidth = 80;
        private boolean autoCut = true;
        private boolean cashDrawer = false;
        private boolean enabled = false;
    }

    /** Public DTO for listing printers (hides IP/port) */
    public record PrinterInfo(String id, String name, int paperWidth, boolean autoCut, boolean cashDrawer) {}
}
