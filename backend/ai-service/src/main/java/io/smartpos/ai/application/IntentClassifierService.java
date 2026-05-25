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
            "confirmed", "pending", "commit",
            "anything wrong", "anomalies", "business health", "what looks off",
            "what should i check", "operational alerts", "problems today",
            "issues today", "suspicious", "unusual"
        ),
        Domain.INVENTORY, List.of(
            "stock", "inventory", "warehouse", "reorder", "expir",
            "batch", "transfer", "adjust", "count", "damage",
            "hisa", "ghala", "idadi", "muda",
            "low stock", "out of stock", "running low",
            "restock", "stock movement", "stock worth", "inventory value",
            "dead stock", "not moving", "slow moving", "stock valuation",
            "money in stock", "money tied", "stockout",
            "what should i order", "what should i buy", "needs restocking",
            "why did stock", "who adjusted", "adjustment history",
            "what is my stock worth", "how much money is tied"
        ),
        Domain.PRODUCTS, List.of(
            "products", "product", "item", "items", "sku", "barcode", "barcodes",
            "category", "categories", "brand", "brands",
            "unit", "units", "price", "cost", "variant", "serial",
            "bidhaa", "bei", "aina", "chapa", "kipimo",
            "recently added", "new arrivals", "what was added",
            "product history", "product timeline", "product lifecycle",
            "when was this product", "who changed this product",
            "price history", "product audit", "last 10 products"
        ),
        Domain.CUSTOMERS, List.of(
            "customers", "customer", "client", "clients", "loyalty",
            "group", "groups", "gift card", "store credit",
            "wateja", "mteja", "kadi", "mkopo",
            "tell me about customer", "customer profile", "customer 360",
            "what does this customer", "customer insights", "customer intelligence",
            "customer usually buy", "customer history"
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
        "\\b(" +
        // Greetings and social phrases — short messages are language-tells.
        "habari|mambo|jambo|salama|karibu|asante|hujambo|sijambo|" +
        "shikamoo|marahaba|poa|sawa|kwaheri|tutaonana|" +
        // Common verb subject/object prefixes (most Swahili sentences open with one of these).
        "naomba|nina|ninataka|unaweza|unataka|unaona|unajua|" +
        "niambie|niambia|nionyeshe|nipe|nisaidie|nifundishe|nifanyaje|" +
        "tunaweza|tuna|wameongeza|wameuza|" +
        // Verbs and helpers
        "tengeneza|ongeza|futa|badilisha|rekebisha|jinsi|maelezo|mafunzo|" +
        "onyesha|orodha|hesabu|angalia|tafuta|fungua|fungia|kagua|" +
        // Domain nouns
        "mauzo|wateja|bidhaa|hisa|ghala|bohari|stoo|fedha|malipo|gharama|" +
        "faida|kodi|akaunti|pesa|mapato|matumizi|wafanyakazi|mhudumu|" +
        "likizo|mshahara|wapangaji|mpango|usajili|idadi|muda|bei|aina|" +
        "chapa|kipimo|mteja|kadi|mkopo|risiti|oda|thamani|kiasi|" +
        // Time expressions
        "leo|jana|kesho|wiki|mwezi|mwaka|sasa|baadaye|" +
        // Demonstratives, articles and connectors
        "hii|huu|hiki|hicho|kile|hizi|hizo|zile|wale|" +
        "hakuna|kuna|gani|gapi|yupi|upi|" +
        // Particles & prepositions — very common in any sentence
        "ya|wa|la|za|kwa|na|katika|kuhusu|kwenye|" +
        // Possessive pronouns (yangu/yako/yake catch "stock yangu")
        "yangu|yako|yake|yetu|yenu|yao" +
        ")\\b",
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
        TIME_KEYWORDS.put("past 30 days", ResolvedTime.TimeType.LAST_30_DAYS);
        // Calendar last month — Tanzanian merchants saying "mwezi uliopita"
        // mean April 1 to April 30, not "the last 30 days".
        TIME_KEYWORDS.put("last month", ResolvedTime.TimeType.LAST_MONTH);
        TIME_KEYWORDS.put("previous month", ResolvedTime.TimeType.LAST_MONTH);
        TIME_KEYWORDS.put("mwezi uliopita", ResolvedTime.TimeType.LAST_MONTH);
        TIME_KEYWORDS.put("mwezi jana", ResolvedTime.TimeType.LAST_MONTH);
        TIME_KEYWORDS.put("last week", ResolvedTime.TimeType.LAST_WEEK);
        TIME_KEYWORDS.put("wiki iliyopita", ResolvedTime.TimeType.LAST_WEEK);
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
                || t.equals("getbusinessanomalies")
                || t.equals("getproducttimeline")
                || t.startsWith("send") || t.startsWith("email")) {
                narrowed.add(tool);
            }
        }
        if (intent.primaryDomain() == Domain.HELP) {
            allToolNames.stream()
                .filter(t -> {
                    String l = t.toLowerCase();
                    return l.contains("search") || l.contains("get") || l.equals("teachmodule");
                })
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
                || tool.equals("generatedocument") || tool.equals("emaildocument")
                || tool.equals("getbusinessanomalies");
            case INVENTORY -> tool.contains("stock") || tool.contains("warehouse")
                || tool.contains("inventory") || tool.equals("checkstock")
                || tool.equals("checkstockbyproductsearch")
                || tool.equals("getlowstock") || tool.equals("getexpiringstock")
                || tool.equals("searchproducts") || tool.equals("getproductinventory")
                || tool.equals("getlatestproduct") || tool.equals("adjuststock")
                || tool.equals("createpurchaseorder")
                || tool.equals("getinventorymovements") || tool.equals("getstockvaluation")
                || tool.equals("getdeadstock") || tool.equals("getreordersuggestions")
                || tool.equals("getlatestproducts");
            case PRODUCTS -> tool.contains("product") || tool.equals("searchproducts")
                || tool.equals("createproduct") || tool.equals("updateproductprice")
                || tool.equals("getproducttimeline") || tool.equals("getlatestproducts");
            case CUSTOMERS -> tool.contains("customer") || tool.equals("gettopcustomers")
                || tool.equals("getsalesbycustomer") || tool.equals("getcustomerprofile");
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
        if (isLatestProductQuery(lower)) {
            return Domain.PRODUCTS;
        }
        // "recently added products", "new arrivals", "last N products added" -> PRODUCTS
        if (lower.matches(".*\\b(recent|recently|new|last)\\b.*\\b(product|products|item|items|arrival|arrivals)\\b.*")
            && !lower.contains("sales") && !lower.contains("order")) {
            return Domain.PRODUCTS;
        }
        // Customer profile queries -> CUSTOMERS
        if (lower.matches(".*\\b(tell me about|customer profile|customer 360|what does this customer|about customer)\\b.*")) {
            return Domain.CUSTOMERS;
        }
        // Anomalies / business health -> SALES
        if (lower.matches(".*\\b(anything wrong|anomalies|business health|what looks off|what should i check|problems today|issues today)\\b.*")) {
            return Domain.SALES;
        }
        if (lower.matches(".*\\b(how many|quantity|qty)\\b.*\\b(do we have|available|left|in stock)\\b.*")
            || lower.matches(".*\\b(do we have|available|left|in stock)\\b.*")) {
            return Domain.INVENTORY;
        }
        if (lower.matches(".*\\b(invoice|receipt|quotation|document)\\b.*\\b(email|send|generate)\\b.*")
            || lower.matches(".*\\b(email|send|generate)\\b.*\\b(invoice|receipt|quotation|document)\\b.*")) {
            return Domain.SALES;
        }
        // Stock movements, valuation, dead stock, reorder -> INVENTORY
        if (lower.matches(".*\\b(stock movement|stock worth|inventory value|dead stock|not moving|slow moving|reorder|restock|what should i order|what should i buy|what should i discount|stock reduce|why did stock|money is tied|money tied)\\b.*")) {
            return Domain.INVENTORY;
        }
        // Product timeline/history -> PRODUCTS
        if (lower.matches(".*\\b(when was this product|who changed this product|product history|product timeline|product lifecycle|price history)\\b.*")) {
            return Domain.PRODUCTS;
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
            case LAST_WEEK -> {
                LocalDate lastMonday = today.with(java.time.DayOfWeek.MONDAY).minusWeeks(1);
                yield new ResolvedTime(type,
                    lastMonday.format(fmt),
                    lastMonday.plusDays(6).format(fmt));
            }
            case THIS_MONTH -> new ResolvedTime(type,
                today.withDayOfMonth(1).format(fmt),
                today.format(fmt));
            case LAST_MONTH -> {
                LocalDate firstOfLast = today.minusMonths(1).withDayOfMonth(1);
                LocalDate lastOfLast = firstOfLast.withDayOfMonth(firstOfLast.lengthOfMonth());
                yield new ResolvedTime(type, firstOfLast.format(fmt), lastOfLast.format(fmt));
            }
            case LAST_30_DAYS -> new ResolvedTime(type,
                today.minusDays(30).format(fmt),
                today.format(fmt));
            case CUSTOM -> new ResolvedTime(type, null, null);
        };
    }

    private boolean isWriteAction(String lower) {
        if (isLatestProductQuery(lower)) {
            return false;
        }
        // Read-only queries that contain write-like keywords
        if (lower.matches(".*\\b(who adjusted|why did stock|stock movement|adjustment history)\\b.*")) return false;
        if (lower.matches(".*\\b(what should i order|what should i buy|what needs restocking|reorder suggestion)\\b.*")) return false;
        if (lower.matches(".*\\b(who changed this product|price history|product history|product timeline)\\b.*")) return false;
        if (lower.matches(".*\\b(show recently added|what was added|new arrivals|last.*products added)\\b.*")) return false;
        if (lower.matches(".*\\b(stock worth|inventory value|dead stock|not moving|slow moving)\\b.*")) return false;
        if (lower.matches(".*\\b(anything wrong|anomalies|business health|what looks off)\\b.*")) return false;
        return WRITE_KEYWORDS.stream().anyMatch(lower::contains);
    }

    private boolean isLatestProductQuery(String lower) {
        boolean latest = lower.matches(".*\\b(last|latest|newest|recent|recently)\\b.*");
        boolean productish = lower.matches(".*\\b(product|products|item|items|stock|inventory|catalog|catalogue)\\b.*");
        boolean added = lower.matches(".*\\b(added|created|new)\\b.*");
        return latest && productish && (added || lower.contains("latest product") || lower.contains("newest item"));
    }

    private List<String> extractKeywords(String lower) {
        return Arrays.stream(lower.split("[\\s,?.!]+"))
            .filter(w -> w.length() > 2)
            .distinct()
            .limit(10)
            .toList();
    }
}
