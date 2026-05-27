package io.smartpos.ai.application;

import io.smartpos.ai.api.dto.IntentClassification;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pins Swahili detection for real-world inputs that previously fell back
 * to English. Includes single-word greetings and short questions — the
 * places where the language tell is sparse.
 */
class SwahiliDetectionTest {

    private final IntentClassifierService classifier = new IntentClassifierService();

    @ParameterizedTest
    @ValueSource(strings = {
        "habari",
        "Habari yako?",
        "mambo vipi",
        "jambo",
        "karibu",
        "asante sana",
        "unaweza niambia thamani ya stock ya yangu?",
        "nionyeshe mauzo ya leo",
        "nina swali",
        "ninataka kuona bidhaa zangu",
        "hesabu ya mauzo wiki hii",
        "kuna stock kiasi gani?",
        "thamani ya stoo yangu ni nini?",
        "kwaheri",
        "nifundishe jinsi ya kufanya refund"
    })
    void detectsSwahili(String input) {
        IntentClassification intent = classifier.classify(input);
        assertThat(intent.language())
            .as("Expected SWAHILI or MIXED for: '%s' (was %s)", input, intent.language())
            .isIn(IntentClassification.Language.SWAHILI, IntentClassification.Language.MIXED);
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "how much is the stock",
        "show me sales today",
        "what is my revenue",
        "send invoice to customer",
        "list all products"
    })
    void doesNotMisclassifyEnglishAsSwahili(String input) {
        IntentClassification intent = classifier.classify(input);
        assertThat(intent.language()).isEqualTo(IntentClassification.Language.ENGLISH);
    }
}
