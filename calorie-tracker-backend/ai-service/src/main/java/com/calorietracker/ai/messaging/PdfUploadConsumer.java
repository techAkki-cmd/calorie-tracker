package com.calorietracker.ai.messaging;

import com.calorietracker.ai.client.CoreMealClient;
import com.calorietracker.ai.config.RabbitMQConfig;
import com.calorietracker.ai.dto.ImportedMealRequest;
import com.calorietracker.ai.dto.NutritionDiaryItem;
import com.calorietracker.ai.exception.AiExtractionException;
import com.calorietracker.ai.service.MealValidation;
import jakarta.validation.Validator;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.core.type.TypeReference;
import java.nio.file.StandardCopyOption;
import java.nio.file.StandardOpenOption;
import java.nio.channels.FileChannel;
import com.calorietracker.ai.pdf.PdfParserUtil;
import com.calorietracker.ai.service.GeminiVisionService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Component
@Slf4j
public class PdfUploadConsumer {

    private final Path importDir;
    private final PdfParserUtil pdfParserUtil;
    private final GeminiVisionService geminiVisionService;
    private final CoreMealClient coreMealClient;
    private final Validator validator;
    private final ObjectMapper objectMapper;

    public PdfUploadConsumer(@Value("${pdf.import-dir}") String importDir,
                             PdfParserUtil pdfParserUtil,
                             GeminiVisionService geminiVisionService,
                             CoreMealClient coreMealClient, Validator validator, ObjectMapper objectMapper) {
        this.importDir = Path.of(importDir).toAbsolutePath().normalize();
        this.pdfParserUtil = pdfParserUtil;
        this.geminiVisionService = geminiVisionService;
        this.coreMealClient = coreMealClient;
        this.validator = validator;
        this.objectMapper = objectMapper;
    }

    @RabbitListener(queues = RabbitMQConfig.PDF_UPLOAD_QUEUE)
    public void receivePdfUpload(PdfUploadMessage message) throws IOException {
        Files.createDirectories(importDir);
        Path lockPath = importDir.resolve(MealValidation.hash(message.userId() + ":" + message.fileReference()) + ".lock");
        try (var channel = FileChannel.open(lockPath, StandardOpenOption.CREATE, StandardOpenOption.WRITE);
             var lock = channel.lock()) {
            processLocked(message);
        }
    }

    private void processLocked(PdfUploadMessage message) throws IOException {
        if (message.userId() == null) {
            throw AiExtractionException.badRequest("An import user is required");
        }
        Path manifest = importDir.resolve(MealValidation.hash(message.userId() + ":" + message.fileReference())
                + ".meals.json");
        List<ImportedMealRequest> meals;
        if (Files.exists(manifest)) {
            meals = objectMapper.readValue(Files.readString(manifest), new TypeReference<>() {});
        } else {
            Path pdf = resolveImportPath(message.fileReference());
            String text = pdfParserUtil.extractText(Files.readAllBytes(pdf));
            String documentFingerprint = MealValidation.hash(normalizeDiaryText(text));
            // The file timestamp is the durable upload-time fallback for undated diaries. It also
            // keeps a dead-letter replay deterministic without changing the existing wire contract.
            List<NutritionDiaryItem> items = geminiVisionService.parseNutritionDiary(
                    text, Files.getLastModifiedTime(pdf).toInstant());
            meals = new ArrayList<>(items.size());
            for (int index = 0; index < items.size(); index++) {
                meals.add(MealValidation.meal(validator, message.userId(), items.get(index),
                        "pdf:" + documentFingerprint + ":" + index));
            }
            // Publish an immutable extraction snapshot before the first database write.
            Path temporary = Files.createTempFile(importDir, "extraction-", ".tmp");
            try {
                Files.writeString(temporary, objectMapper.writeValueAsString(meals));
                Files.move(temporary, manifest, StandardCopyOption.ATOMIC_MOVE);
            } finally {
                Files.deleteIfExists(temporary);
            }
        }
        coreMealClient.postBulk(message.userId(), meals);
        // Keep the snapshot for replay after a commit/ack crash; preserve the PDF on failure.
        try {
            Files.deleteIfExists(resolveImportPath(message.fileReference()));
        } catch (AiExtractionException | IOException cleanupFailure) {
            log.warn("Import completed; PDF cleanup unavailable for {}", message.fileReference());
        }
        log.info("Imported {} meals for user {}", meals.size(), message.userId());
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

    private static String normalizeDiaryText(String text) {
        return text.lines()
                .map(String::trim)
                .filter(line -> !line.isEmpty())
                .collect(Collectors.joining("\n"));
    }

}
