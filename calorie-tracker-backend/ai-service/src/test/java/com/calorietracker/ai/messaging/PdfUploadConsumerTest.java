package com.calorietracker.ai.messaging;

import com.calorietracker.ai.client.CoreMealClient;
import com.calorietracker.ai.dto.ImportedMealRequest;
import com.calorietracker.ai.dto.NutritionDiaryItem;
import com.calorietracker.ai.dto.PdfImportJobStatus;
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
import java.time.Instant;
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
        UUID jobId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();

        consumer.receivePdfUpload(new PdfUploadMessage(jobId, userId, "diary.pdf"));

        assertThat(gemini.lastText).contains("Oatmeal breakfast");
        assertThat(coreClient.userIds).containsExactly(userId);
        assertThat(coreClient.batches).hasSize(1);
        ImportedMealRequest meal = coreClient.batches.getFirst().getFirst();
        assertThat(meal.name()).isEqualTo("Oatmeal");
        assertThat(meal.mealType()).isEqualTo("BREAKFAST");
        assertThat(meal.consumedAt()).isNotNull();
        assertThat(importDir.resolve("diary.pdf")).doesNotExist();
        assertThat(coreClient.statuses).containsExactly(new StatusUpdate(jobId, PdfImportJobStatus.COMPLETED));
        assertImportDirectoryIsEmpty();
    }

    @Test
    void propagatesFailureReportsFailedAndRemovesEveryArtifact() throws Exception {
        Files.write(importDir.resolve("diary.pdf"), PdfParserUtilTest.pdfWithText("bad diary"));
        gemini.fail = true;
        UUID jobId = UUID.randomUUID();

        assertThatThrownBy(() -> consumer.receivePdfUpload(
                new PdfUploadMessage(jobId, UUID.randomUUID(), "diary.pdf")))
                .isInstanceOf(AiExtractionException.class);
        assertThat(coreClient.batches).isEmpty();
        assertThat(coreClient.statuses).containsExactly(new StatusUpdate(jobId, PdfImportJobStatus.FAILED));
        assertImportDirectoryIsEmpty();
    }

    @Test
    void coreFailureRemovesPdfManifestAndLock() throws Exception {
        Files.write(importDir.resolve("diary.pdf"), PdfParserUtilTest.pdfWithText("Oatmeal"));
        UUID jobId = UUID.randomUUID();
        var message = new PdfUploadMessage(jobId, UUID.randomUUID(), "diary.pdf");
        coreClient.fail = true;
        assertThatThrownBy(() -> consumer.receivePdfUpload(message))
                .isInstanceOf(IllegalStateException.class);
        assertThat(coreClient.statuses).containsExactly(new StatusUpdate(jobId, PdfImportJobStatus.FAILED));
        assertImportDirectoryIsEmpty();
    }

    @Test
    void duplicatePdfContentUsesSameIdempotencyKeysAcrossStoredFileNames() throws Exception {
        byte[] diary = PdfParserUtilTest.pdfWithText("Oatmeal breakfast");
        Files.write(importDir.resolve("first.pdf"), diary);
        Files.write(importDir.resolve("retry.pdf"), diary);
        UUID userId = UUID.randomUUID();

        consumer.receivePdfUpload(new PdfUploadMessage(UUID.randomUUID(), userId, "first.pdf"));
        consumer.receivePdfUpload(new PdfUploadMessage(UUID.randomUUID(), userId, "retry.pdf"));

        assertThat(coreClient.batches).hasSize(2);
        assertThat(coreClient.batches.get(0).getFirst().idempotencyKey())
                .isEqualTo(coreClient.batches.get(1).getFirst().idempotencyKey());
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

    private void assertImportDirectoryIsEmpty() throws Exception {
        try (var files = Files.list(importDir)) {
            assertThat(files).isEmpty();
        }
    }

    private static final class RecordingGemini extends GeminiVisionService {

        private String lastText;
        private boolean fail;

        private RecordingGemini() {
            super(WebClient.builder().build(), new ObjectMapper(), "gemini-2.5-flash", com.calorietracker.ai.TestValidation.VALIDATOR);
        }

        @Override
        public List<NutritionDiaryItem> parseNutritionDiary(String text, Instant importedAt) {
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
        private final List<StatusUpdate> statuses = new ArrayList<>();

        private RecordingCoreClient() {
            super(WebClient.builder().build());
        }

        @Override
        public void postBulk(UUID userId, List<ImportedMealRequest> meals) {
            if (fail) throw new IllegalStateException("core unavailable");
            userIds.add(userId);
            batches.add(List.copyOf(meals));
        }

        @Override
        public void updateImportJobStatus(UUID jobId, PdfImportJobStatus status) {
            statuses.add(new StatusUpdate(jobId, status));
        }
    }

    private record StatusUpdate(UUID jobId, PdfImportJobStatus status) {
    }
}
