package io.smartpos.ai.application;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.smartpos.ai.api.dto.AiDtos;
import io.smartpos.ai.application.provider.AiProvider;
import io.smartpos.ai.application.provider.AiRouter;
import io.smartpos.ai.domain.model.AiInvocation;
import io.smartpos.ai.domain.repository.AiInvocationRepository;
import io.smartpos.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * AI-assisted product authoring:
 *
 *   suggest(name, context)        → one cleaned-up product proposal
 *   importMap(headers,rows,ctx)   → a list of mapped products with confidence
 *
 * The service builds compact, deterministic prompts and asks the active
 * provider for strict JSON. Output is parsed leniently (markdown fences are
 * stripped) and unrecognised IDs are nulled so the UI can ask the user.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProductAiService {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private static final String SYS_SUGGEST = """
            PRODUCT_SUGGEST
            You help a retail point-of-sale operator add a new product. Given a
            short product name and lists of existing categories, brands and units
            from the user's catalog, return ONE clean product proposal as a JSON
            object that matches this schema EXACTLY:

            {
              "name":              string,           // cleaned-up product name
              "description":       string|null,
              "categoryId":        uuid|null,        // pick from provided categories or null
              "brandId":           uuid|null,        // pick from provided brands or null
              "unitId":            uuid|null,        // pick from provided units or null
              "barcodeSymbology":  "CODE128"|"EAN13"|"EAN8"|"UPC"|"CODE39",
              "code":              string|null,      // a plausible product code or null
              "cost":              number|null,
              "price":             number|null,
              "wholesalePrice":    number|null,
              "minPrice":          number|null,
              "taxRate":           number|null,      // 0-100 (percent)
              "confidence":        number,           // 0.0 - 1.0
              "rationale":         string            // 1-2 short sentences
            }

            Rules:
              - Only use category/brand/unit IDs from the provided lists. If none
                fits, return null for that field — DO NOT invent UUIDs.
              - NAME EXPANSION: if the user typed a vague identifier (e.g.
                "iPhone 17", "Galaxy S24", "Bluetooth speaker"), expand it to
                the most common full SKU including variant attributes
                (storage / capacity / size / colour). Pick the mid-tier
                variant if multiple exist. Examples:
                  "iPhone 17"        → "Apple iPhone 17 256GB"
                  "Galaxy S24"       → "Samsung Galaxy S24 256GB"
                  "Coca-Cola"        → "Coca-Cola 500ml"
              - PRICING: produce realistic East-African retail prices
                (typically TZS / KES / UGX). For consumer electronics,
                anchor against current Tanzanian retail (e.g. iPhone 17
                256GB ≈ TSh 3,000,000 retail / 2,500,000 cost; Coca-Cola
                500ml ≈ TSh 1,000 retail / 700 cost). Set wholesalePrice
                ≈ 0.92 × price and minPrice ≈ 0.88 × price unless context
                suggests otherwise. Do NOT leave price null when the
                product is well-known — guess a sensible mid-market figure.
              - Use the provided currency and default tax rate as a guide.
              - Output ONLY the JSON object — no commentary, no markdown.
            """;

    private static final String SYS_CANDIDATES = """
            PRODUCT_CANDIDATES
            You help a retail POS operator add a product when their input is
            ambiguous (e.g. "Samsung phone", "iPhone", "Bluetooth speaker").
            Return up to FOUR ranked candidate product variants as JSON:

            {
              "ambiguous":     boolean,                  // true when several plausible variants exist
              "clarification": string|null,              // short follow-up Q for the user
              "candidates": [
                {
                  "name": string, "description": string|null,
                  "categoryId": uuid|null, "brandId": uuid|null, "unitId": uuid|null,
                  "barcodeSymbology": "CODE128"|"EAN13"|"EAN8"|"UPC"|"CODE39",
                  "code": string|null,
                  "cost": number|null, "price": number|null,
                  "wholesalePrice": number|null, "minPrice": number|null,
                  "taxRate": number|null,
                  "confidence": number,
                  "rationale": string                    // 1 sentence — what makes THIS variant
                }
              ]
            }

            Rules:
              - Order candidates by likelihood (most likely first).
              - Each candidate's name MUST include the differentiating attribute
                (e.g. storage / colour / capacity / year). Examples:
                  "iPhone"       → ["Apple iPhone 15 128GB", "Apple iPhone 15 256GB",
                                    "Apple iPhone 14 128GB", "Apple iPhone SE 128GB"]
                  "Samsung phone"→ ["Samsung Galaxy S24 256GB", "Samsung Galaxy A55 128GB",
                                    "Samsung Galaxy A15 64GB", "Samsung Galaxy Z Flip5 256GB"]
                  "soda"         → ["Coca-Cola 500ml", "Pepsi 500ml", "Coca-Cola 1L",
                                    "Sprite 500ml"]
              - Realistic East-African retail prices (TZS / KES / UGX) per the
                pricing rules in PRODUCT_SUGGEST.
              - When the input clearly identifies one product, return a single
                candidate with ambiguous=false.
              - Only use category/brand/unit IDs from the provided lists.
              - Output ONLY the JSON object — no commentary, no markdown.
            """;

    private static final String SYS_IMPORT = """
            PRODUCT_IMPORT_MAP
            You help a retail operator bulk-import products from a spreadsheet.
            Given a list of headers and parsed rows, return one mapped product per
            row as JSON matching this schema EXACTLY:

            {
              "rows": [
                {
                  "row":              int,           // original row index
                  "name":             string,
                  "description":      string|null,
                  "categoryId":       uuid|null,
                  "brandId":          uuid|null,
                  "unitId":           uuid|null,
                  "code":             string|null,
                  "barcodeSymbology": "CODE128"|"EAN13"|"EAN8"|"UPC"|"CODE39",
                  "cost":             number|null,
                  "price":            number|null,
                  "wholesalePrice":   number|null,
                  "minPrice":         number|null,
                  "taxRate":          number|null,
                  "confidence":       number,        // 0.0 - 1.0
                  "warnings":         string[]
                }
              ],
              "warnings": string[]                   // global notes (e.g. unrecognised columns)
            }

            Rules:
              - Only use category/brand/unit IDs from the provided lists. If none
                fits, return null AND add a warning like "category 'XYZ' not found".
              - Trim whitespace, parse numbers, infer obvious column meanings.
              - Skip blank rows — do not emit them.
              - Output ONLY the JSON object — no commentary, no markdown.
            """;

    private static final String SYS_DESCRIBE = """
            PRODUCT_DESCRIBE
            You help a retail POS operator add a new product from a free-text
            natural-language description. Given the description and lists of
            existing categories, brands and units, return a COMPLETE product
            profile as JSON matching this schema EXACTLY:

            {
              "name":              string,           // cleaned product name
              "description":       string|null,       // reformulated summary
              "categoryId":        uuid|null,         // from provided categories
              "subCategoryId":     uuid|null,         // from description context
              "brandId":           uuid|null,
              "unitId":            uuid|null,
              "barcodeSymbology":  "CODE128"|"EAN13"|"EAN8"|"UPC"|"CODE39",
              "code":              string|null,       // plausible SKU or null
              "cost":              number|null,
              "price":             number|null,
              "wholesalePrice":    number|null,
              "minPrice":          number|null,
              "taxRate":           number|null,       // 0-100 (percent)
              "taxMethod":         "INCLUSIVE"|"EXCLUSIVE"|null,
              "stockAlert":        integer|null,
              "type":              "STANDARD"|"SERVICE"|"COMBO"|null,
              "warrantyMonths":    integer|null,
              "guaranteeMonths":   integer|null,
              "lengthCm":          number|null,
              "widthCm":           number|null,
              "heightCm":          number|null,
              "weightGrams":       number|null,
              "trackSerial":       boolean,
              "trackImei":         boolean,
              "featured":          boolean,
              "hideOnline":        boolean,
              "points":            integer|null,
              "confidence":        number,            // 0.0-1.0 overall
              "fieldConfidence":   {                  // per-field 0.0-1.0
                "name": 0.95, "price": 0.70, ...
              },
              "rationale":         string             // 1-3 sentence reasoning
            }

            Rules:
              - Parse prices/costs from the description verbatim when the user
                states specific amounts. When the user is vague but the product
                is well-known, supply realistic East-African retail prices in
                TZS / KES / UGX (anchor: iPhone 17 256GB ≈ TSh 3,000,000;
                500ml soda ≈ TSh 1,000; bag of 25kg rice ≈ TSh 80,000).
                wholesalePrice ≈ 0.92 × price, minPrice ≈ 0.88 × price.
              - NAME EXPANSION: turn vague inputs into full SKUs.
                "iPhone 17"          → "Apple iPhone 17 256GB"
                "Galaxy S24"         → "Samsung Galaxy S24 256GB"
                "Tecno phone"        → pick the most common Tecno (e.g.
                                       "Tecno Spark 20 128GB"); if entirely
                                       ambiguous, set confidence ≤ 0.5 and
                                       say so in rationale.
              - Infer product type from description clues: "service", "consulting",
                "repair" → SERVICE; "bundle", "pack", "combo", "set" → COMBO;
                everything else → STANDARD.
              - Extract dimensions/weight when described ("500ml bottle",
                "2kg bag", "50cm wide").
              - For warranty: infer from category norms (smartphones / laptops
                12-24 months; small electronics 6-12; food/groceries null).
              - Only use category/brand/unit IDs from the provided lists — NEVER
                invent UUIDs. If none fits, return null for that field.
              - Use the provided currency and default tax rate as a guide.
              - Return null for fields you cannot reasonably infer.
              - Provide a fieldConfidence map with a score for each non-null field.
              - Output ONLY the JSON object — no commentary, no markdown.
            """;

    private static final String SYS_IMPORT_FROM_IMAGE = """
            PRODUCT_IMPORT_FROM_IMAGE
            You help a retail operator bulk-import products from photos of product
            lists, supplier catalogues, price sheets, or inventory records. The user
            has uploaded one or more images. Read ALL product items visible in every
            image and return them as structured product rows in the same format as
            the spreadsheet import mapper.

            Return JSON matching this schema EXACTLY:

            {
              "rows": [
                {
                  "row":              int,           // row number (1-based, in reading order)
                  "name":             string,        // cleaned product name — required
                  "description":      string|null,
                  "categoryId":       uuid|null,     // from provided categories, or null
                  "brandId":          uuid|null,     // from provided brands, or null
                  "unitId":           uuid|null,     // from provided units, or null
                  "code":             string|null,   // SKU / product code if visible
                  "barcodeSymbology": "CODE128"|"EAN13"|"EAN8"|"UPC"|"CODE39",
                  "cost":             number|null,   // buying / wholesale cost
                  "price":            number|null,   // retail selling price
                  "wholesalePrice":   number|null,
                  "minPrice":         number|null,
                  "taxRate":          number|null,   // 0-100 (percent)
                  "quantity":         number|null,   // opening / on-hand qty if visible (e.g. "x5", "(12)", "qty 24")
                  "confidence":       number,        // 0.0 - 1.0 for this row
                  "warnings":         string[]       // e.g. ["price column blurred — guessed"]
                }
              ],
              "warnings": string[]                   // global notes (e.g. "image 2 is blurry")
            }

            Rules:
              - ONE LINE = ONE PRODUCT.   The most important rule.   If a single
                visible line of writing contains multiple words ("Remote Sony",
                "Coca-Cola 500ml", "Basmati Rice 5kg", "Rimoti Boss"), ALL of
                those words belong to the SAME product row — do NOT split a
                line into multiple rows of one word each. A new row begins ONLY
                when a new line / bullet / table-row starts on the image.
              - HANDWRITING: when the input is handwritten or messy cursive,
                keep words that sit on the same horizontal line together. Use
                vertical position (y-coordinate), not whitespace inside a line,
                to decide row boundaries. Bullets, dashes, numbers ("1.", "•"),
                and large vertical gaps are reliable line separators.
              - PHONETIC / LOAN-WORD NORMALISATION: East-African handwriting
                often spells English product words phonetically in Swahili
                ("Rimoti" → "Remote", "Sukari" → "Sugar", "Soksi" → "Socks",
                "Sabuni" → "Soap", "Saa" → "Watch", "Kompyuta" → "Computer",
                "Simu" → "Phone"). Normalise the FIRST recognised English/loan
                term to its standard English spelling, then keep the rest of
                the line as the model/variant ("Rimoti Boss" → name: "Remote
                Boss"). Add a warning noting the original spelling.
              - DEDUPE only EXACT-DUPLICATE consecutive lines (same words, same
                order). Do NOT merge two different products even if they share
                a leading word — "Remote Boss" and "Remote HD" are TWO rows.
              - OCR EVERY visible product line — do not skip items because they
                are hard to read. If a field is illegible, set it to null and
                add a warning.
              - Parse tabular layouts: if the image shows columns (name, price,
                code, etc.), match each row to the correct field. Use column
                headers or positional heuristics to determine which column is
                which.
              - Parse free-text lists: "• Product A — TZS 5000" or "1. Rice
                25kg @ 80,000" — extract name, price, unit clues.
              - Unit size in name: if the item shows a weight/volume (500ml,
                25kg, 1L, 250g), keep it in the product NAME.
              - Price column: look for currency symbols (TSh, TZS, KES, UGX, $,
                /=) or price patterns. Remove the symbol and parse the numeric
                value. If clearly wholesale/cost, use the "cost" field instead.
              - Only use category/brand/unit IDs from the provided lists. Match
                by name similarity ("BEVERAGES" ≈ provided "Beverages"). If
                none fits, return null AND add a warning.
              - NAME EXPANSION: if the image shows a short name like
                "Coca-Cola", expand to "Coca-Cola 500ml" if the volume is
                visible elsewhere.
              - Pricing: produce realistic East-African prices (TZS / KES /
                UGX). If the image shows prices in a different currency, use
                approximate rates (1 USD ≈ 2500 TZS, 1 EUR ≈ 2800 TZS).
              - QUANTITY DETECTION: many handwritten / printed lists include
                an opening-stock quantity next to each item. Extract it into
                "quantity" when you see ANY of these patterns:
                  • "× N", "x N", "*N"          → "Remote × 5"        → 5
                  • "(N)", "[N]"                 → "Soap (12)"          → 12
                  • "qty: N", "Qty N", "Q N"     → "Rice qty 24"        → 24
                  • "kiasi N", "idadi N", "pcs N", "pieces N"   → 6
                  • a bare integer at end of a non-tabular line that is NOT a
                    price (no currency symbol, no decimal cents, value < 200
                    OR clearly stock-shaped like 5, 12, 24, 50, 100, 144)
                  • a leading count column in a table with header
                    "QTY" / "STOCK" / "ON HAND" / "BAL" / "KIASI"
                If you read a quantity, ALSO add a warning of the form
                "qty:N read from image" so the operator can verify. If no
                quantity is visible, leave "quantity" as null — DO NOT
                infer a quantity from product knowledge (zero invention here;
                stock counts must come from the image).
              - SKIP rows that are clearly headers, totals, or blank lines.
              - SANITY CHECK before returning: count the visible product lines
                in the image. The number of rows you return MUST equal that
                count (±0). If you find yourself emitting more rows than there
                are visible lines, you have wrongly split a multi-word line —
                merge them back.

              ── EXTRACT FIRST, INFER ONLY THE GAPS ─────────────────────────
              PRIORITY ORDER (apply for EVERY field on EVERY row):

                (1) READ FROM IMAGE FIRST. If a value is written, printed,
                    typed, drawn, or otherwise visible in the image — even
                    partially — USE IT. Do NOT replace a visible value with
                    an inferred one. Visible values are ground truth.
                    Examples that count as "visible":
                      • a price next to / under / inside a column for that row
                      • a column header that maps to a field (e.g. "RETAIL",
                        "CHENJI", "BEI YA JUMLA", "@", "TSh")
                      • a brand printed on packaging shown in the photo
                      • a category written in a section heading above a group
                        of rows ("BEVERAGES", "VYAKULA")
                      • currency symbols, weights, units, codes, barcodes
                    For every visible value: confidence stays high (0.9–0.98),
                    add NO "inferred:" warning, and DO add a normal warning
                    only if the OCR was uncertain (e.g. "price column blurry,
                    read as 8500").

                (2) INFER FROM KNOWLEDGE ONLY for fields that are MISSING from
                    the image. Never override a visible value just because
                    your guess seems "more typical".

              When the image only shows a product NAME (no prices, no
              category column, no brand label, etc.), DO NOT leave the other
              fields blank. Use what you know about the product to propose
              reasonable defaults — the operator can edit them. This is the
              difference between giving them an empty form to fill and giving
              them a working draft.

              For every row you confidently identify (confidence ≥ 0.7), fill
              in EVERY field below using your product knowledge:

                category   – pick the BEST match from the provided categories
                             list (e.g. "Remote Boss" → "Electronics
                             Accessories"; "Rice 5kg" → "Groceries"; "Soap" →
                             "Personal Care"). If no provided category fits,
                             leave categoryId null AND add a warning naming
                             the category you would have chosen.
                brand      – if the name contains a known brand ("Boss",
                             "Coca-Cola", "Sony", "Nike"), match it against
                             the provided brands list. If unmatched, leave
                             brandId null AND name the brand in a warning.
                unit       – infer the natural selling unit ("pcs" for
                             remotes/clothes/electronics, "kg" for rice/sugar,
                             "ltr" or "ml" for drinks/oils, "bag" for bulk).
                             Match the provided units list when possible.
                cost       – realistic East-African wholesale cost in the
                             tenant's currency (TZS unless context says
                             otherwise). E.g. a generic universal TV remote
                             ≈ 4,000–6,000 TZS cost.
                price      – realistic retail price, typically cost × 1.4–2.0
                             for general retail. Universal remote ≈ 8,000–
                             12,000 TZS retail.
                wholesalePrice – between cost and retail, usually cost × 1.15.
                minPrice   – cost × 1.05 (the cashier's price floor).
                taxRate    – 18 (standard Tanzania VAT) unless context says
                             otherwise; 0 for unprocessed groceries / exempt
                             goods (rice, flour, raw vegetables).
                description – ONE short sentence (≤ 80 chars) describing the
                             product (e.g. "Universal infrared TV remote
                             control"). Skip if you can't be specific.

              EVERY inferred field (not visible in the image) MUST add a
              warning to the row's "warnings" array of the form:
                  "inferred:<field>=<value> (verify)"
              so the operator can see what was guessed vs. read. Inferred
              rows should also drop confidence by 0.1 — visible-only rows can
              be 0.95; inference-heavy rows should be 0.6–0.75.

              If you CANNOT confidently identify the product (low-confidence
              OCR, made-up name, gibberish), leave the numeric / brand /
              category fields null and set confidence < 0.5 — do NOT invent
              numbers for things you don't recognise.
              ────────────────────────────────────────────────────────────────

              - Output ONLY the JSON object — no commentary, no markdown.
            """;

    private final AiRouter aiRouter;
    private final AiInvocationRepository invocations;

    // ── public ────────────────────────────────────────────────────────────

    public AiDtos.ProductSuggestion suggest(AiDtos.ProductSuggestRequest req, UUID userId) {
        String userPrompt = buildSuggestPrompt(req);
        AiProvider provider = aiRouter.active();
        long t0 = System.currentTimeMillis();
        AiProvider.Result result;
        String error = null;
        try {
            result = provider.completeJson(SYS_SUGGEST, userPrompt);
        } catch (Exception e) {
            error = e.getMessage();
            log.warn("AI provider {} failed: {}", provider.name(), error);
            result = new AiProvider.Result("{}", 0, 0);
        }
        int duration = (int) (System.currentTimeMillis() - t0);

        invocations.save(AiInvocation.builder()
                .kind("PRODUCT_SUGGEST").provider(provider.name()).model(provider.model())
                .promptTokens(result.promptTokens()).completionTokens(result.completionTokens())
                .inputSummary("suggest " + req.name())
                .output(truncate(result.text(), 4000)).error(error).userId(userId).tenantId(TenantContext.require())
                .durationMs(duration).build());

        JsonNode root = parseJson(result.text());
        return new AiDtos.ProductSuggestion(
                str(root, "name", req.name()),
                str(root, "description", null),
                uuid(root, "categoryId"),
                uuid(root, "brandId"),
                uuid(root, "unitId"),
                str(root, "barcodeSymbology", "CODE128"),
                str(root, "code", null),
                bd(root, "cost"),
                bd(root, "price"),
                bd(root, "wholesalePrice"),
                bd(root, "minPrice"),
                bd(root, "taxRate"),
                num(root, "confidence", 0.0),
                str(root, "rationale", null),
                provider.name(),
                provider.model(),
                Instant.now()
        );
    }

    public AiDtos.ProductDescribeResponse describe(AiDtos.ProductDescribeRequest req, UUID userId) {
        String userPrompt = buildDescribePrompt(req);
        AiProvider provider = aiRouter.active();
        long t0 = System.currentTimeMillis();
        AiProvider.Result result;
        String error = null;
        try {
            result = provider.completeJson(SYS_DESCRIBE, userPrompt);
        } catch (Exception e) {
            error = e.getMessage();
            log.warn("AI provider {} failed: {}", provider.name(), error);
            result = new AiProvider.Result("{}", 0, 0);
        }
        int duration = (int) (System.currentTimeMillis() - t0);

        invocations.save(AiInvocation.builder()
                .kind("PRODUCT_DESCRIBE").provider(provider.name()).model(provider.model())
                .promptTokens(result.promptTokens()).completionTokens(result.completionTokens())
                .inputSummary("describe " + truncate(req.description(), 120))
                .output(truncate(result.text(), 4000)).error(error).userId(userId).tenantId(TenantContext.require())
                .durationMs(duration).build());

        return mapDescribeResponse(parseJson(result.text()), provider, req.description());
    }

    /** Build a ProductDescribeResponse from a parsed JSON object. Used by both
     *  the text-based {@link #describe} flow and the vision-based fromImage flow. */
    private AiDtos.ProductDescribeResponse mapDescribeResponse(JsonNode root, AiProvider provider, String fallbackName) {
        var fieldConf = parseFieldConfidence(root);
        return new AiDtos.ProductDescribeResponse(
                str(root, "name", fallbackName),
                str(root, "description", null),
                uuid(root, "categoryId"),
                uuid(root, "subCategoryId"),
                uuid(root, "brandId"),
                uuid(root, "unitId"),
                str(root, "barcodeSymbology", "CODE128"),
                str(root, "code", null),
                bd(root, "cost"),
                bd(root, "price"),
                bd(root, "wholesalePrice"),
                bd(root, "minPrice"),
                bd(root, "taxRate"),
                str(root, "taxMethod", null),
                root.hasNonNull("stockAlert") ? root.get("stockAlert").asInt() : null,
                str(root, "type", null),
                root.hasNonNull("warrantyMonths") ? root.get("warrantyMonths").asInt() : null,
                root.hasNonNull("guaranteeMonths") ? root.get("guaranteeMonths").asInt() : null,
                bd(root, "lengthCm"),
                bd(root, "widthCm"),
                bd(root, "heightCm"),
                bd(root, "weightGrams"),
                bool(root, "trackSerial"),
                bool(root, "trackImei"),
                bool(root, "featured"),
                bool(root, "hideOnline"),
                root.hasNonNull("points") ? root.get("points").asInt() : null,
                num(root, "confidence", 0.0),
                fieldConf,
                str(root, "rationale", null),
                provider.name(),
                provider.model(),
                Instant.now()
        );
    }

    /** Build a ProductSuggestion from a parsed JSON node — used by the
     *  candidates flow where each array entry has the same shape as suggest(). */
    private AiDtos.ProductSuggestion mapSuggestion(JsonNode root, AiProvider provider, String fallbackName) {
        return new AiDtos.ProductSuggestion(
                str(root, "name", fallbackName),
                str(root, "description", null),
                uuid(root, "categoryId"),
                uuid(root, "brandId"),
                uuid(root, "unitId"),
                str(root, "barcodeSymbology", "CODE128"),
                str(root, "code", null),
                bd(root, "cost"),
                bd(root, "price"),
                bd(root, "wholesalePrice"),
                bd(root, "minPrice"),
                bd(root, "taxRate"),
                num(root, "confidence", 0.0),
                str(root, "rationale", null),
                provider.name(),
                provider.model(),
                Instant.now()
        );
    }

    /**
     * Vision flow: take a base64 product photo (or several) and return a full
     * product profile, same shape as {@link #describe}. Reuses SYS_DESCRIBE
     * but feeds the model an image-content block via the provider's vision API.
     */
    public AiDtos.ProductDescribeResponse fromImage(AiDtos.ProductFromImageRequest req, UUID userId) {
        if (req.imageDataUrls() == null || req.imageDataUrls().isEmpty() || req.imageDataUrls().size() > 3) {
            throw new IllegalArgumentException("Upload 1 to 3 product images.");
        }
        for (String image : req.imageDataUrls()) {
            if (image == null || image.isBlank() || image.length() > 1_200_000) {
                throw new IllegalArgumentException("Each product image must be a non-empty data URL or HTTPS URL under 1.2 MB.");
            }
            boolean isDataImage = image.startsWith("data:image/");
            boolean isHttpsImage = image.startsWith("https://");
            if (!isDataImage && !isHttpsImage) {
                throw new IllegalArgumentException("Product images must be data:image URLs or HTTPS URLs.");
            }
        }

        StringBuilder userPrompt = new StringBuilder();
        userPrompt.append("Identify this product from the image(s) and return the full profile.\n");
        if (req.hint() != null && !req.hint().isBlank()) {
            userPrompt.append("Operator hint: ").append(req.hint().trim()).append('\n');
        }
        if (req.context() != null) appendContext(userPrompt, req.context());

        AiProvider provider = aiRouter.active();
        long t0 = System.currentTimeMillis();
        AiProvider.Result result;
        String error = null;
        try {
            result = provider.completeJsonWithImages(SYS_DESCRIBE, userPrompt.toString(), req.imageDataUrls());
        } catch (Exception e) {
            error = e.getMessage();
            log.warn("AI provider {} vision failed: {}", provider.name(), error);
            result = new AiProvider.Result("{}", 0, 0);
        }
        int duration = (int) (System.currentTimeMillis() - t0);

        invocations.save(AiInvocation.builder()
                .kind("PRODUCT_FROM_IMAGE").provider(provider.name()).model(provider.model())
                .promptTokens(result.promptTokens()).completionTokens(result.completionTokens())
                .inputSummary("from-image (" + req.imageDataUrls().size() + " img)")
                .output(truncate(result.text(), 4000)).error(error).userId(userId).tenantId(TenantContext.require())
                .durationMs(duration).build());

        return mapDescribeResponse(parseJson(result.text()), provider, "(image input)");
    }

    /**
     * Batch image import: accept one or more photos of a product list / catalogue
     * page, OCR-read all items via the vision provider, and return mapped product
     * rows (same shape as {@link #importMap}) so the user can review and bulk-create.
     */
    public AiDtos.ProductImportMapResponse importFromImages(AiDtos.ProductImportFromImagesRequest req, UUID userId) {
        if (req.imageDataUrls() == null || req.imageDataUrls().isEmpty() || req.imageDataUrls().size() > 5) {
            throw new IllegalArgumentException("Upload 1 to 5 images of the product list.");
        }
        for (String image : req.imageDataUrls()) {
            if (image == null || image.isBlank() || image.length() > 1_200_000) {
                throw new IllegalArgumentException("Each image must be a non-empty data URL or HTTPS URL under 1.2 MB.");
            }
            boolean isDataImage = image.startsWith("data:image/");
            boolean isHttpsImage = image.startsWith("https://");
            if (!isDataImage && !isHttpsImage) {
                throw new IllegalArgumentException("Images must be data:image URLs or HTTPS URLs.");
            }
        }

        StringBuilder userPrompt = new StringBuilder();
        userPrompt.append("Read ALL product items from the uploaded image(s) and return them as structured rows.\n");
        if (req.hint() != null && !req.hint().isBlank()) {
            userPrompt.append("Operator hint: ").append(req.hint().trim()).append('\n');
        }
        if (req.context() != null) appendContext(userPrompt, req.context());

        AiProvider provider = aiRouter.active();
        long t0 = System.currentTimeMillis();
        AiProvider.Result result;
        String error = null;
        try {
            result = provider.completeJsonWithImages(SYS_IMPORT_FROM_IMAGE, userPrompt.toString(), req.imageDataUrls());
        } catch (Exception e) {
            error = e.getMessage();
            log.warn("AI provider {} import-from-images failed: {}", provider.name(), error);
            result = new AiProvider.Result("{\"rows\":[],\"warnings\":[\"" + safe(error) + "\"]}", 0, 0);
        }
        int duration = (int) (System.currentTimeMillis() - t0);

        invocations.save(AiInvocation.builder()
                .kind("PRODUCT_IMPORT_FROM_IMAGE").provider(provider.name()).model(provider.model())
                .promptTokens(result.promptTokens()).completionTokens(result.completionTokens())
                .inputSummary("import-from-images (" + req.imageDataUrls().size() + " img)")
                .output(truncate(result.text(), 4000)).error(error).userId(userId).tenantId(TenantContext.require())
                .durationMs(duration).build());

        // Reuse the same response parsing as importMap
        JsonNode root = parseJson(result.text());
        List<AiDtos.MappedRow> mapped = new ArrayList<>();
        if (root.has("rows") && root.get("rows").isArray()) {
            for (JsonNode r : root.get("rows")) {
                List<String> wlist = new ArrayList<>();
                if (r.has("warnings") && r.get("warnings").isArray()) {
                    r.get("warnings").forEach(w -> wlist.add(w.asText()));
                }
                mapped.add(new AiDtos.MappedRow(
                        r.path("row").asInt(0),
                        str(r, "name", ""),
                        str(r, "description", null),
                        uuid(r, "categoryId"),
                        uuid(r, "brandId"),
                        uuid(r, "unitId"),
                        str(r, "code", null),
                        str(r, "barcodeSymbology", "CODE128"),
                        bd(r, "cost"),
                        bd(r, "price"),
                        bd(r, "wholesalePrice"),
                        bd(r, "minPrice"),
                        bd(r, "taxRate"),
                        bd(r, "quantity"),
                        num(r, "confidence", 0.0),
                        wlist
                ));
            }
        }
        List<String> globalWarnings = new ArrayList<>();
        if (root.has("warnings") && root.get("warnings").isArray()) {
            root.get("warnings").forEach(w -> globalWarnings.add(w.asText()));
        }
        return new AiDtos.ProductImportMapResponse(
                mapped, globalWarnings, provider.name(), provider.model(),
                result.promptTokens(), result.completionTokens(), Instant.now()
        );
    }

    /**
     * Disambiguation flow: given a vague seed name, return up to 4 ranked
     * candidate products. UI shows them as quick-pick chips. The {@code top}
     * field stays populated for callers that ignore candidates.
     */
    public AiDtos.ProductCandidatesResponse suggestCandidates(AiDtos.ProductSuggestRequest req, UUID userId) {
        String userPrompt = buildSuggestPrompt(req);
        AiProvider provider = aiRouter.active();
        long t0 = System.currentTimeMillis();
        AiProvider.Result result;
        String error = null;
        try {
            result = provider.completeJson(SYS_CANDIDATES, userPrompt);
        } catch (Exception e) {
            error = e.getMessage();
            log.warn("AI provider {} candidates failed: {}", provider.name(), error);
            result = new AiProvider.Result("{\"candidates\":[]}", 0, 0);
        }
        int duration = (int) (System.currentTimeMillis() - t0);

        invocations.save(AiInvocation.builder()
                .kind("PRODUCT_CANDIDATES").provider(provider.name()).model(provider.model())
                .promptTokens(result.promptTokens()).completionTokens(result.completionTokens())
                .inputSummary("candidates " + req.name())
                .output(truncate(result.text(), 4000)).error(error).userId(userId).tenantId(TenantContext.require())
                .durationMs(duration).build());

        JsonNode root = parseJson(result.text());
        java.util.List<AiDtos.ProductSuggestion> list = new java.util.ArrayList<>();
        JsonNode arr = root.get("candidates");
        if (arr != null && arr.isArray()) {
            for (JsonNode c : arr) list.add(mapSuggestion(c, provider, req.name()));
        }
        AiDtos.ProductSuggestion top = list.isEmpty() ? mapSuggestion(root, provider, req.name()) : list.get(0);
        Boolean ambiguous = root.hasNonNull("ambiguous") ? root.get("ambiguous").asBoolean() : list.size() > 1;
        return new AiDtos.ProductCandidatesResponse(
                top, list, ambiguous, str(root, "clarification", null),
                provider.name(), provider.model(), Instant.now()
        );
    }

    public AiDtos.ProductImportMapResponse importMap(AiDtos.ProductImportMapRequest req, UUID userId) {
        String userPrompt = buildImportPrompt(req);
        AiProvider provider = aiRouter.active();
        long t0 = System.currentTimeMillis();
        AiProvider.Result result;
        String error = null;
        try {
            result = provider.completeJson(SYS_IMPORT, userPrompt);
        } catch (Exception e) {
            error = e.getMessage();
            log.warn("AI provider {} failed: {}", provider.name(), error);
            result = new AiProvider.Result("{\"rows\":[],\"warnings\":[\"" + safe(error) + "\"]}", 0, 0);
        }
        int duration = (int) (System.currentTimeMillis() - t0);

        invocations.save(AiInvocation.builder()
                .kind("PRODUCT_IMPORT_MAP").provider(provider.name()).model(provider.model())
                .promptTokens(result.promptTokens()).completionTokens(result.completionTokens())
                .inputSummary("import-map " + req.rows().size() + " rows")
                .output(truncate(result.text(), 4000)).error(error).userId(userId).tenantId(TenantContext.require())
                .durationMs(duration).build());

        JsonNode root = parseJson(result.text());
        List<AiDtos.MappedRow> mapped = new ArrayList<>();
        if (root.has("rows") && root.get("rows").isArray()) {
            for (JsonNode r : root.get("rows")) {
                List<String> warnings = new ArrayList<>();
                if (r.has("warnings") && r.get("warnings").isArray()) {
                    r.get("warnings").forEach(w -> warnings.add(w.asText()));
                }
                mapped.add(new AiDtos.MappedRow(
                        r.path("row").asInt(0),
                        str(r, "name", ""),
                        str(r, "description", null),
                        uuid(r, "categoryId"),
                        uuid(r, "brandId"),
                        uuid(r, "unitId"),
                        str(r, "code", null),
                        str(r, "barcodeSymbology", "CODE128"),
                        bd(r, "cost"),
                        bd(r, "price"),
                        bd(r, "wholesalePrice"),
                        bd(r, "minPrice"),
                        bd(r, "taxRate"),
                        bd(r, "quantity"),
                        num(r, "confidence", 0.0),
                        warnings
                ));
            }
        }
        List<String> globalWarnings = new ArrayList<>();
        if (root.has("warnings") && root.get("warnings").isArray()) {
            root.get("warnings").forEach(w -> globalWarnings.add(w.asText()));
        }
        return new AiDtos.ProductImportMapResponse(
                mapped, globalWarnings, provider.name(), provider.model(),
                result.promptTokens(), result.completionTokens(), Instant.now()
        );
    }

    // ── prompt builders ───────────────────────────────────────────────────

    private String buildSuggestPrompt(AiDtos.ProductSuggestRequest req) {
        StringBuilder sb = new StringBuilder();
        sb.append("Product name: ").append(req.name()).append('\n');
        if (req.hint() != null && !req.hint().isBlank()) {
            sb.append("Hint: ").append(req.hint()).append('\n');
        }
        appendContext(sb, req.context());
        return sb.toString();
    }

    private String buildDescribePrompt(AiDtos.ProductDescribeRequest req) {
        StringBuilder sb = new StringBuilder();
        sb.append("Product description:\n\"\"\"\n").append(req.description()).append("\n\"\"\"\n");
        appendContext(sb, req.context());
        return sb.toString();
    }

    private String buildImportPrompt(AiDtos.ProductImportMapRequest req) {
        StringBuilder sb = new StringBuilder();
        if (req.headers() != null) {
            sb.append("Headers: ").append(String.join(", ", req.headers())).append('\n');
        }
        sb.append("Row count: ").append(req.rows().size()).append('\n');
        appendContext(sb, req.context());
        sb.append("Rows (JSON):\n");
        try {
            sb.append(MAPPER.writeValueAsString(req.rows()));
        } catch (Exception e) {
            sb.append("[]");
        }
        return sb.toString();
    }

    private void appendContext(StringBuilder sb, AiDtos.WorkspaceContext ctx) {
        if (ctx == null) return;
        if (ctx.currency() != null)        sb.append("Currency: ").append(ctx.currency()).append('\n');
        if (ctx.defaultTaxRate() != null)  sb.append("Default tax rate: ").append(ctx.defaultTaxRate()).append("%\n");
        if (ctx.categories() != null)      sb.append("Categories: ").append(refsJson(ctx.categories())).append('\n');
        if (ctx.brands()     != null)      sb.append("Brands: ").append(refsJson(ctx.brands())).append('\n');
        if (ctx.units()      != null)      sb.append("Units: ").append(refsJson(ctx.units())).append('\n');
    }

    private String refsJson(List<AiDtos.NamedRef> refs) {
        try { return MAPPER.writeValueAsString(refs); } catch (Exception e) { return "[]"; }
    }

    // ── JSON parsing helpers ──────────────────────────────────────────────

    /** Strips ```json fences``` then parses; returns an empty object on failure. */
    private static JsonNode parseJson(String raw) {
        if (raw == null) return MAPPER.createObjectNode();
        String s = raw.trim();
        // Strip code fences if the model wrapped its output despite instructions.
        Pattern fence = Pattern.compile("```(?:json)?\\s*([\\s\\S]*?)```");
        Matcher m = fence.matcher(s);
        if (m.find()) s = m.group(1).trim();
        try {
            return MAPPER.readTree(s);
        } catch (Exception e) {
            log.warn("Failed to parse AI JSON: {}", e.getMessage());
            return MAPPER.createObjectNode();
        }
    }

    private static String str(JsonNode n, String k, String fallback) {
        if (n == null || !n.hasNonNull(k)) return fallback;
        String v = n.get(k).asText();
        return (v == null || v.isBlank() || "null".equalsIgnoreCase(v)) ? fallback : v;
    }
    private static UUID uuid(JsonNode n, String k) {
        String v = str(n, k, null);
        if (v == null) return null;
        try { return UUID.fromString(v); } catch (Exception e) { return null; }
    }
    private static BigDecimal bd(JsonNode n, String k) {
        if (n == null || !n.hasNonNull(k)) return null;
        try { return new BigDecimal(n.get(k).asText()); } catch (Exception e) { return null; }
    }
    private static Double num(JsonNode n, String k, double fallback) {
        if (n == null || !n.hasNonNull(k)) return fallback;
        return n.get(k).asDouble(fallback);
    }
    private static Boolean bool(JsonNode n, String k) {
        if (n == null || !n.hasNonNull(k)) return null;
        return n.get(k).asBoolean();
    }
    private static java.util.Map<String, Double> parseFieldConfidence(JsonNode root) {
        if (root == null || !root.hasNonNull("fieldConfidence")) return null;
        JsonNode fc = root.get("fieldConfidence");
        if (!fc.isObject()) return null;
        var map = new java.util.HashMap<String, Double>();
        var it = fc.fields();
        while (it.hasNext()) {
            var entry = it.next();
            map.put(entry.getKey(), entry.getValue().asDouble());
        }
        return map;
    }
    private static String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() <= max ? s : s.substring(0, max) + "…";
    }
    private static String safe(String s) {
        return s == null ? "" : s.replace("\"", "'");
    }

    /** No-op reference so spot-bugs / IDE don't strip unused imports. */
    @SuppressWarnings("unused")
    private static final TypeReference<List<AiDtos.MappedRow>> KEEP_TYPEREF = new TypeReference<>() {};
}
