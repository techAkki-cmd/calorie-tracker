package com.calorietracker.ai.messaging;

import com.calorietracker.ai.client.CoreMealClient;
import com.calorietracker.ai.config.RabbitMQConfig;
import com.calorietracker.ai.dto.ImportedMealRequest;
import com.calorietracker.ai.dto.NutritionDiaryItem;
import com.calorietracker.ai.exception.AiExtractionException;
import com.calorietracker.ai.pdf.PdfParserUtil;
import com.calorietracker.ai.service.GeminiVisionService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClientRequestException;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Component
@Slf4j
public class PdfUploadConsumer {

    private final Path importDir;
    private final PdfParserUtil pdfParserUtil;
    private final GeminiVisionService geminiVisionService;
    private final CoreMealClient coreMealClient;

    public PdfUploadConsumer(@Value("${pdf.import-dir}") String importDir,
                             PdfParserUtil pdfParserUtil,
                             GeminiVisionService geminiVisionService,
                             CoreMealClient coreMealClient) {
        this.importDir = Path.of(importDir).toAbsolutePath().normalize();
        this.pdfParserUtil = pdfParserUtil;
        this.geminiVisionService = geminiVisionService;
        this.coreMealClient = coreMealClient;
    }

    @RabbitListener(queues = RabbitMQConfig.PDF_UPLOAD_QUEUE)
    public void receivePdfUpload(PdfUploadMessage message) {
        try {
            byte[] pdf = Files.readAllBytes(resolveImportPath(message.fileReference()));
            String text = pdfParserUtil.extractText(pdf);
            List<ImportedMealRequest> meals = toImportedMeals(geminiVisionService.parseNutritionDiary(text));
            coreMealClient.postBulk(message.userId(), meals);
            log.info("Imported {} meals from {} for user {}", meals.size(), message.fileReference(),
                    message.userId());
        } catch (AiExtractionException | WebClientResponseException | WebClientRequestException | IOException ex) {
            // Do not rethrow: a hallucinated JSON payload would otherwise retry forever.
            log.warn("Failed to import PDF {} for user {}: {}",
                    message.fileReference(), message.userId(), ex.getMessage());
        }
    }

    /**
     * {@code fileReference} is a relative path under the import directory. Absolute paths and
     * {@code ..} segments that escape the directory are rejected.
     */
    Path resolveImportPath(String fileReference) {
        if (fileReference == null || fileReference.isBlank()) {
            throw AiExtractionException.badRequest("A file reference is required");
        }

        Path requested = Path.of(fileReference);
        if (requested.isAbsolute()) {
            throw AiExtractionException.badRequest("PDF file reference must be relative to the import directory");
        }

        Path resolved = importDir.resolve(requested).normalize();
        if (!resolved.startsWith(importDir)) {
            throw AiExtractionException.badRequest("PDF file reference escapes the import directory");
        }
        if (!Files.isRegularFile(resolved)) {
            throw AiExtractionException.badRequest("PDF file was not found in the import directory");
        }
        return resolved;
    }

    private static List<ImportedMealRequest> toImportedMeals(List<NutritionDiaryItem> items) {
        LocalDateTime consumedAt = LocalDateTime.now().truncatedTo(ChronoUnit.SECONDS);
        List<ImportedMealRequest> meals = new ArrayList<>(items.size());
        for (NutritionDiaryItem item : items) {
            meals.add(new ImportedMealRequest(
                    item.name(),
                    item.mealType(),
                    item.quantity(),
                    item.calories(),
                    scale(item.protein()),
                    scale(item.carbs()),
                    scale(item.fat()),
                    null,
                    consumedAt));
        }
        return meals;
    }

    private static BigDecimal scale(Double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP);
    }
}
