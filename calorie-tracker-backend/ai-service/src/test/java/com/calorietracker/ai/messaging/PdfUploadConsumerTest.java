package com.calorietracker.ai.messaging;

import com.calorietracker.ai.client.CoreMealClient;
import com.calorietracker.ai.dto.ImportedMealRequest;
import com.calorietracker.ai.dto.NutritionDiaryItem;
import com.calorietracker.ai.exception.AiExtractionException;
import com.calorietracker.ai.pdf.PdfParserUtil;
import com.calorietracker.ai.pdf.PdfParserUtilTest;
import com.calorietracker.ai.service.GeminiVisionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.web.reactive.function.client.WebClient;
import tools.jackson.databind.ObjectMapper;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PdfUploadConsumerTest {

    @TempDir
    Path importDir;

    private RecordingGemini gemini;
    private RecordingCoreClient coreClient;
    private PdfUploadConsumer consumer;

    @BeforeEach
    void setUp() {
        gemini = new RecordingGemini();
        coreClient = new RecordingCoreClient();
        consumer = new PdfUploadConsumer(importDir.toString(), new PdfParserUtil(), gemini, coreClient, com.calorietracker.ai.TestValidation.VALIDATOR,
                new ObjectMapper());
    }

    @Test
    void importsPdfAndPostsBulkMeals() throws Exception {
        Files.write(importDir.resolve("diary.pdf"), PdfParserUtilTest.pdfWithText("Oatmeal breakfast"));
        UUID userId = UUID.randomUUID();

        consumer.receivePdfUpload(new PdfUploadMessage(userId, "diary.pdf"));

        assertThat(gemini.lastText).contains("Oatmeal breakfast");
        assertThat(coreClient.userIds).containsExactly(userId);
        assertThat(coreClient.batches).hasSize(1);
        ImportedMealRequest meal = coreClient.batches.getFirst().getFirst();
        assertThat(meal.name()).isEqualTo("Oatmeal");
        assertThat(meal.mealType()).isEqualTo("BREAKFAST");
        assertThat(meal.consumedAt()).isNotNull();
        assertThat(importDir.resolve("diary.pdf")).doesNotExist();
    }

    @Test
    void propagatesFailureAndPreservesPdfForDeadLetterReplay() throws Exception {
        Files.write(importDir.resolve("diary.pdf"), PdfParserUtilTest.pdfWithText("bad diary"));
        gemini.fail = true;

        assertThatThrownBy(() -> consumer.receivePdfUpload(new PdfUploadMessage(UUID.randomUUID(), "diary.pdf")))
                .isInstanceOf(AiExtractionException.class);
        assertThat(coreClient.batches).isEmpty();
        assertThat(importDir.resolve("diary.pdf")).exists();
    }

    @Test
    void replaysSnapshotWithoutCallingGeminiAfterSuccessfulImport() throws Exception {
        Files.write(importDir.resolve("diary.pdf"), PdfParserUtilTest.pdfWithText("Oatmeal"));
        var message = new PdfUploadMessage(UUID.randomUUID(), "diary.pdf");
        consumer.receivePdfUpload(message);
        gemini.fail = true;
        consumer.receivePdfUpload(message);
        assertThat(coreClient.batches).hasSize(2);
        assertThat(coreClient.batches.get(0)).isEqualTo(coreClient.batches.get(1));
    }

    @Test
    void coreFailurePreservesSnapshotForReplay() throws Exception {
        Files.write(importDir.resolve("diary.pdf"), PdfParserUtilTest.pdfWithText("Oatmeal"));
        var message = new PdfUploadMessage(UUID.randomUUID(), "diary.pdf");
        coreClient.fail = true;
        assertThatThrownBy(() -> consumer.receivePdfUpload(message))
                .isInstanceOf(IllegalStateException.class);
        assertThat(importDir.resolve("diary.pdf")).exists();
        coreClient.fail = false;
        gemini.fail = true;
        consumer.receivePdfUpload(message);
        assertThat(coreClient.batches).hasSize(1);
        assertThat(importDir.resolve("diary.pdf")).doesNotExist();
    }

    @Test
    void rejectsPathTraversal() {
        assertThatThrownBy(() -> consumer.resolveImportPath("../secret.pdf"))
                .isInstanceOf(AiExtractionException.class)
                .hasMessageContaining("escapes");
    }

    @Test
    void rejectsAbsolutePath() {
        assertThatThrownBy(() -> consumer.resolveImportPath("/tmp/other.pdf"))
                .isInstanceOf(AiExtractionException.class)
                .hasMessageContaining("relative");
    }

    private static final class RecordingGemini extends GeminiVisionService {

        private String lastText;
        private boolean fail;

        private RecordingGemini() {
            super(WebClient.builder().build(), new ObjectMapper(), "gemini-2.5-flash", com.calorietracker.ai.TestValidation.VALIDATOR);
        }

        @Override
        public List<NutritionDiaryItem> parseNutritionDiary(String text) {
            lastText = text;
            if (fail) {
                throw AiExtractionException.badGateway("hallucinated json");
            }
            return List.of(new NutritionDiaryItem("Oatmeal", "BREAKFAST", "1 bowl", 320, 10.0, 54.0, 6.0, "2026-01-01T08:00:00Z"));
        }
    }

    private static final class RecordingCoreClient extends CoreMealClient {

        private boolean fail;
        private final List<UUID> userIds = new ArrayList<>();
        private final List<List<ImportedMealRequest>> batches = new ArrayList<>();

        private RecordingCoreClient() {
            super(WebClient.builder().build());
        }

        @Override
        public void postBulk(UUID userId, List<ImportedMealRequest> meals) {
            if (fail) throw new IllegalStateException("core unavailable");
            userIds.add(userId);
            batches.add(List.copyOf(meals));
        }
    }
}
