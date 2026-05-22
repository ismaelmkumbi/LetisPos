package io.smartpos.ai.application;

import io.smartpos.ai.api.dto.IntentClassification;
import io.smartpos.ai.api.dto.IntentClassification.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Pattern;

/**
 * Classifies user messages before they reach the LLM.
 * <p>
 * Produces an {@link IntentClassification} that downstream components use to:
 * <ul>
 *   <li>Narrow the tool catalog (domain-specific tools only)</li>
 *   <li>Select domain-specific system prompts and few-shot examples</li>
 *   <li>Resolve natural-language time expressions into concrete dates</li>
 *   <li>Detect language for Swahili/English response generation</li>
 * </ul>
 * <p>
 * <b>Design rationale:</b> Classification runs locally (zero LLM cost, sub-millisecond
 * latency). It uses keyword + pattern matching rather than a second LLM call. This
 * is intentionally simple — the LLM sees the narrowed tools and makes the final
 * selection decision. The classifier just reduces the search space.
 */
@Service
public class IntentClassifierService {

    private static final Logger log = LoggerFactory.getLogger(IntentClassifierService.class);

    // ── Domain keyword mappings ──

    private static final Map<Domain, List<String>> DOMAIN_KEYWORDS = Map.of(
        Domain.SALES, List.of(
            "sales", "sale", "order", "orders", "revenue", "transaction",
            "transactions", "receipt", "receipts", "invoice", "invoices",
            "mauzo", "oda", "mapato", "risiti",
            "confirmed", "pending", "commit"
        ),
        Domain.INVENTORY, List.of(
            "stock", "inventory", "warehouse", "reorder", "expir",
            "batch", "transfer", "adjust", "count", "damage",
            "hisa", "ghala", "idadi", "muda",
            "low stock", "out of stock", "running low"
        ),
        Domain.PRODUCTS, List.of(
            "products", "product", "sku", "barcode", "barcodes",
            "category", "categories", "brand", "brands",
            "unit", "units", "price", "cost", "variant", "serial",
            "bidhaa", "bei", "aina", "chapa", "kipimo"
        ),
        Domain.CUSTOMERS, List.of(
            "customers", "customer", "client", "clients", "loyalty",
            "group", "groups", "gift card", "store credit",
            "wateja", "mteja", "kadi", "mkopo"
        ),
        Domain.FINANCE, List.of(
            "finance", "financial", "payment", "payments",
            "expenses", "expense", "profit", "loss",
            "account", "accounts", "tax", "taxes", "deposit",
            "cash", "bank", "fedha", "malipo", "gharama",
            "faida", "kodi", "akaunti", "pesa", "mapato", "matumizi"
        ),
        Domain.HRM, List.of(
            "employee", "staff", "attendance", "leave", "payroll",
            "salary", "wafanyakazi", "mhudumu", "likizo", "mshahara",
            "worker", "hr", "human resource"
        ),
        Domain.HELP, List.of(
            "how do i", "how to", "help me", "guide", "tutorial",
            "explain how", "where can i", "how can i",
            "refund", "process a return", "steps to",
            "jinsi ya", "nifanyaje", "mafunzo",
            "nisaidie", "nifundishe", "maelezo"
        ),
        Domain.PLATFORM_ADMIN, List.of(
            "tenant", "tenants", "subscription", "plan", "billing plan",
            "all stores", "across tenant", "platform", "admin",
            "wapangaji", "ternant", "mpango", "usajili"
        )
    );

    // ── Write action keywords ──

    private static final List<String> WRITE_KEYWORDS = List.of(
        "create", "add", "new", "make", "delete", "remove",
        "adjust", "update", "change", "modify", "set",
        "tengeneza", "ongeza", "futa", "badilisha", "rekebisha",
        "purchase order", "expense", "promotion",
        "register", "send", "approve", "cancel", "commit"
    );

    // ── Swahili detection ──

    private static final Pattern SWAHILI_PATTERN = Pattern.compile(
        "\\b(naomba|nina|ni|tengeneza|ongeza|futa|badilisha|rekebisha|" +
        "nifanyaje|jinsi|maelezo|mafunzo|nisaidie|nifundishe|" +
        "mauzo|wateja|bidhaa|hisa|ghala|fedha|malipo|gharama|faida|kodi|" +
        "akaunti|pesa|mapato|matumizi|wafanyakazi|mhudumu|likizo|mshahara|" +
        "wapangaji|ternant|mpango|usajili|idadi|muda|bei|aina|chapa|kipimo|" +
        "mteja|kadi|mkopo|risiti|oda|leo|jana|wiki|mwezi|hii|huu|" +
        "hakuna|kuna|gani|gapi|yupi|upi|za)\\b",
        Pattern.CASE_INSENSITIVE
    );

    // ── Time expression patterns ──

    private static final Map<String, ResolvedTime.TimeType> TIME_KEYWORDS = new LinkedHashMap<>();
    static {
        TIME_KEYWORDS.put("leo", ResolvedTime.TimeType.TODAY);
        TIME_KEYWORDS.put("today", ResolvedTime.TimeType.TODAY);
        TIME_KEYWORDS.put("jana", ResolvedTime.TimeType.YESTERDAY);
        TIME_KEYWORDS.put("yesterday", ResolvedTime.TimeType.YESTERDAY);
        TIME_KEYWORDS.put("wiki hii", ResolvedTime.TimeType.THIS_WEEK);
        TIME_KEYWORDS.put("this week", ResolvedTime.TimeType.THIS_WEEK);
        TIME_KEYWORDS.put("mwezi huu", ResolvedTime.TimeType.THIS_MONTH);
        TIME_KEYWORDS.put("this month", ResolvedTime.TimeType.THIS_MONTH);
        TIME_KEYWORDS.put("last 30 days", ResolvedTime.TimeType.LAST_30_DAYS);
        TIME_KEYWORDS.put("siku 30 zilizopita", ResolvedTime.TimeType.LAST_30_DAYS);
        TIME_KEYWORDS.put("last month", ResolvedTime.TimeType.LAST_30_DAYS);
        TIME_KEYWORDS.put("mwezi uliopita", ResolvedTime.TimeType.LAST_30_DAYS);
    }

    // ── Public API ──

    /**
     * Classify a user message into domains, language, and resolved time.
     *
     * @param message raw user input (English or Swahili)
     * @return classification with primary domain, language, and time resolution
     */
    public IntentClassification classify(String message) {
        if (message == null || message.isBlank()) {
            return IntentClassification.of(Domain.GENERAL, Language.ENGLISH);
        }

        String lower = message.toLowerCase().trim();

        Domain primary = classifyDomain(lower);
        double confidence = computeConfidence(lower, primary);
        Set<Domain> secondaries = findSecondaryDomains(lower, primary);
        Language lang = detectLanguage(lower);
        ResolvedTime time = extractTime(lower);
        boolean isWrite = isWriteAction(lower);
        List<String> keywords = extractKeywords(lower);

        return new IntentClassification(primary, secondaries, lang, time, isWrite, keywords, confidence);
    }

    /**
     * Return the subset of tool names relevant to the classified domain.
     * Used by the orchestration pipeline to narrow the tool catalog before
     * sending to the LLM, saving tokens and improving selection accuracy.
     */
    public Set<String> narrowTools(IntentClassification intent, Set<String> allToolNames) {
        if (intent == null || intent.primaryDomain() == Domain.GENERAL || intent.confidence() < 0.5) {
            return allToolNames;
        }
        Set<String> narrowed = new HashSet<>();
        Set<Domain> domains = EnumSet.of(intent.primaryDomain());
        domains.addAll(intent.secondaryDomains());
        for (String tool : allToolNames) {
            String t = tool.toLowerCase();
            // Keep cross-domain tools and tools relevant to the classified domains.
            if (matchesAnyDomain(t, domains)
                || t.equals("searchdocuments") || t.equals("searchsales")
                || t.equals("getnotificationtemplates")
                || t.equals("getexecutivebriefing")
                || t.equals("getdailysnapshot")
                || t.startsWith("send") || t.startsWith("email")) {
                narrowed.add(tool);
            }
        }
        if (intent.primaryDomain() == Domain.HELP) {
            allToolNames.stream()
                .filter(t -> t.toLowerCase().contains("search") || t.toLowerCase().contains("get"))
                .forEach(narrowed::add);
        }
        return narrowed.isEmpty() ? allToolNames : narrowed;
    }

    private boolean matchesAnyDomain(String tool, Set<Domain> domains) {
        for (Domain domain : domains) {
            if (matchesDomain(tool, domain)) return true;
        }
        return false;
    }

    private boolean matchesDomain(String tool, Domain domain) {
        return switch (domain) {
            case SALES -> tool.contains("sales") || tool.equals("getrecentsales")
                || tool.equals("gettopproducts") || tool.equals("gettopcustomers")
                || tool.equals("generatedocument") || tool.equals("emaildocument");
            case INVENTORY -> tool.contains("stock") || tool.contains("warehouse")
                || tool.contains("inventory") || tool.equals("checkstock")
                || tool.equals("checkstockbyproductsearch")
                || tool.equals("getlowstock") || tool.equals("getexpiringstock")
                || tool.equals("searchproducts") || tool.equals("getproductinventory")
                || tool.equals("adjuststock") || tool.equals("createpurchaseorder");
            case PRODUCTS -> tool.contains("product") || tool.equals("searchproducts")
                || tool.equals("createproduct") || tool.equals("updateproductprice");
            case CUSTOMERS -> tool.contains("customer") || tool.equals("gettopcustomers")
                || tool.equals("getsalesbycustomer");
            case FINANCE -> tool.contains("financial") || tool.contains("expense")
                || tool.contains("payment") || tool.contains("tax")
                || tool.contains("discount") || tool.equals("createexpense");
            case HRM -> tool.contains("employee") || tool.contains("attendance")
                || tool.contains("leave") || tool.contains("payroll") || tool.contains("hr");
            case PLATFORM_ADMIN -> tool.contains("tenant") || tool.contains("platform");
            case HELP -> tool.contains("search") || tool.startsWith("get");
            case GENERAL -> true;
        };
    }

    private double computeConfidence(String lower, Domain primary) {
        if (primary == Domain.GENERAL) return 0.3; // uncertain
        var keywords = DOMAIN_KEYWORDS.get(primary);
        if (keywords == null || keywords.isEmpty()) return 0.3;
        long matchCount = keywords.stream()
            .filter(kw -> containsWord(lower, kw))
            .count();
        // More matches → higher confidence, capped at 0.95
        return Math.min(0.95, 0.4 + (matchCount * 0.15));
    }

    // ── Classification logic ──

    private Domain classifyDomain(String lower) {
        if (lower.matches(".*\\b(how many|quantity|qty)\\b.*\\b(do we have|available|left|in stock)\\b.*")
            || lower.matches(".*\\b(do we have|available|left|in stock)\\b.*")) {
            return Domain.INVENTORY;
        }
        if (lower.matches(".*\\b(invoice|receipt|quotation|document)\\b.*\\b(email|send|generate)\\b.*")
            || lower.matches(".*\\b(email|send|generate)\\b.*\\b(invoice|receipt|quotation|document)\\b.*")) {
            return Domain.SALES;
        }

        Domain best = Domain.GENERAL;
        int bestScore = 0;

        for (var entry : DOMAIN_KEYWORDS.entrySet()) {
            int score = 0;
            for (String kw : entry.getValue()) {
                // Use word-boundary matching to avoid false positives
                // e.g. "wafanyakazi" should not match "nifanyaje" via substring "fany"
                if (containsWord(lower, kw)) {
                    score += kw.length() * kw.length(); // square for stronger signal
                }
            }
            if (score > bestScore) {
                bestScore = score;
                best = entry.getKey();
            }
        }
        return best;
    }

    /** Match keyword as whole word or phrase, not arbitrary substring. */
    private static boolean containsWord(String text, String keyword) {
        // For multi-word phrases, do substring match (they're specific enough)
        if (keyword.contains(" ")) {
            return text.contains(keyword);
        }
        // For single words, match word boundaries
        int idx = text.indexOf(keyword);
        if (idx < 0) return false;
        // Check character before
        if (idx > 0 && Character.isLetterOrDigit(text.charAt(idx - 1))) return false;
        // Check character after
        int end = idx + keyword.length();
        if (end < text.length() && Character.isLetterOrDigit(text.charAt(end))) return false;
        return true;
    }

    private Set<Domain> findSecondaryDomains(String lower, Domain primary) {
        Set<Domain> secondary = EnumSet.noneOf(Domain.class);
        for (var entry : DOMAIN_KEYWORDS.entrySet()) {
            if (entry.getKey() == primary) continue;
            long matches = entry.getValue().stream()
                .filter(kw -> containsWord(lower, kw))
                .count();
            if (matches >= 1) {
                secondary.add(entry.getKey());
            }
        }
        return secondary;
    }

    private Language detectLanguage(String lower) {
        boolean hasSwahili = SWAHILI_PATTERN.matcher(lower).find();
        // Check for English by counting common English function words
        boolean hasEnglish = lower.matches(".*\\b(the|a|an|is|are|was|were|do|does|did|" +
            "what|when|where|which|who|how|my|show|get|list|find|tell|" +
            "can|could|will|would|should|have|has|had|this|that|these|those|" +
            "in|on|at|to|for|of|from|with|by)\\b.*");
        if (hasSwahili && hasEnglish) return Language.MIXED;
        if (hasSwahili) return Language.SWAHILI;
        return Language.ENGLISH;
    }

    private ResolvedTime extractTime(String lower) {
        // Check for explicit date patterns first (YYYY-MM-DD)
        var datePattern = java.util.regex.Pattern.compile("(\\d{4}-\\d{2}-\\d{2})");
        var matcher = datePattern.matcher(lower);
        List<String> dates = new ArrayList<>();
        while (matcher.find()) {
            dates.add(matcher.group(1));
        }
        if (dates.size() >= 2) {
            return new ResolvedTime(ResolvedTime.TimeType.CUSTOM, dates.get(0), dates.get(1));
        }

        // Check keyword patterns (longest match first)
        for (var entry : TIME_KEYWORDS.entrySet()) {
            if (lower.contains(entry.getKey())) {
                return resolveTimeType(entry.getValue());
            }
        }
        return new ResolvedTime(ResolvedTime.TimeType.TODAY, null, null);
    }

    private ResolvedTime resolveTimeType(ResolvedTime.TimeType type) {
        LocalDate today = LocalDate.now();
        DateTimeFormatter fmt = DateTimeFormatter.ISO_LOCAL_DATE;

        return switch (type) {
            case TODAY -> new ResolvedTime(type, today.format(fmt), today.format(fmt));
            case YESTERDAY -> {
                LocalDate yesterday = today.minusDays(1);
                yield new ResolvedTime(type, yesterday.format(fmt), yesterday.format(fmt));
            }
            case THIS_WEEK -> new ResolvedTime(type,
                today.with(java.time.DayOfWeek.MONDAY).format(fmt),
                today.format(fmt));
            case THIS_MONTH -> new ResolvedTime(type,
                today.withDayOfMonth(1).format(fmt),
                today.format(fmt));
            case LAST_30_DAYS -> new ResolvedTime(type,
                today.minusDays(30).format(fmt),
                today.format(fmt));
            case CUSTOM -> new ResolvedTime(type, null, null);
        };
    }

    private boolean isWriteAction(String lower) {
        return WRITE_KEYWORDS.stream().anyMatch(lower::contains);
    }

    private List<String> extractKeywords(String lower) {
        return Arrays.stream(lower.split("[\\s,?.!]+"))
            .filter(w -> w.length() > 2)
            .distinct()
            .limit(10)
            .toList();
    }
}
