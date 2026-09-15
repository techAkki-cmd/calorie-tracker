package com.calorietracker.ai.messaging;

import com.calorietracker.ai.client.CoreMealClient;
import com.calorietracker.ai.config.RabbitMQConfig;
import com.calorietracker.ai.dto.ImportedMealRequest;
import com.calorietracker.ai.dto.NutritionDiaryItem;
import com.calorietracker.ai.dto.PdfImportJobStatus;
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
        String artifactKey = MealValidation.hash(message.userId() + ":" + message.fileReference());
        Path lockPath = importDir.resolve(artifactKey + ".lock");
        Path manifestPath = importDir.resolve(artifactKey + ".meals.json");
        Path pdfPath = null;
        try {
            Files.createDirectories(importDir);
            pdfPath = resolveImportPath(message.fileReference());
            validateMessage(message);
            try (var channel = FileChannel.open(lockPath, StandardOpenOption.CREATE, StandardOpenOption.WRITE);
                 var lock = channel.lock()) {
                processLocked(message, pdfPath, manifestPath);
            }
            coreMealClient.updateImportJobStatus(message.jobId(), PdfImportJobStatus.COMPLETED);
            log.info("Completed PDF import job {} for user {}", message.jobId(), message.userId());
        } catch (IOException | RuntimeException failure) {
            reportFailure(message.jobId(), failure);
            throw failure;
        } finally {
            deleteArtifact(pdfPath, "PDF");
            deleteArtifact(manifestPath, "extraction manifest");
            deleteArtifact(lockPath, "lock file");
        }
    }

    private void processLocked(PdfUploadMessage message, Path pdf, Path manifest) throws IOException {
        List<ImportedMealRequest> meals;
        if (Files.exists(manifest)) {
            meals = objectMapper.readValue(Files.readString(manifest), new TypeReference<>() {});
        } else {
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
        log.info("Imported {} meals for user {}", meals.size(), message.userId());
    }

    private static void validateMessage(PdfUploadMessage message) {
        if (message.jobId() == null) {
            throw AiExtractionException.badRequest("An import job is required");
        }
        if (message.userId() == null) {
            throw AiExtractionException.badRequest("An import user is required");
        }
    }

    private void reportFailure(java.util.UUID jobId, Exception originalFailure) {
        if (jobId == null) {
            return;
        }
        try {
            coreMealClient.updateImportJobStatus(jobId, PdfImportJobStatus.FAILED);
        } catch (RuntimeException callbackFailure) {
            originalFailure.addSuppressed(callbackFailure);
            log.error("Could not mark PDF import job {} as FAILED", jobId, callbackFailure);
        }
    }

    private void deleteArtifact(Path path, String description) {
        if (path == null) {
            return;
        }
        try {
            Files.deleteIfExists(path);
        } catch (IOException cleanupFailure) {
            log.warn("Could not delete {} {}", description, path.getFileName(), cleanupFailure);
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

    private static String normalizeDiaryText(String text) {
        return text.lines()
                .map(String::trim)
                .filter(line -> !line.isEmpty())
                .collect(Collectors.joining("\n"));
    }

}
