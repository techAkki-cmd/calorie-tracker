package com.calorietracker.core.service;

import com.calorietracker.core.dto.PdfImportJobResponse;
import com.calorietracker.core.dto.PagedResponse;
import com.calorietracker.core.exception.ResourceNotFoundException;
import com.calorietracker.core.model.PdfImportJob;
import com.calorietracker.core.model.PdfImportJobStatus;
import com.calorietracker.core.model.OutboxEvent;
import com.calorietracker.core.messaging.PdfImportRequestedPayload;
import com.calorietracker.core.repository.OutboxEventRepository;
import com.calorietracker.core.repository.PdfImportJobRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.UUID;
import tools.jackson.databind.ObjectMapper;

@Service
@Slf4j
public class PdfImportJobService {

    private final PdfImportJobRepository repository;
    private final OutboxEventRepository outboxRepository;
    private final ObjectMapper objectMapper;
    private final Path importDir;

    public PdfImportJobService(PdfImportJobRepository repository,
                               OutboxEventRepository outboxRepository,
                               ObjectMapper objectMapper,
                               @Value("${pdf.import-dir}") String importDir) {
        this.repository = repository;
        this.outboxRepository = outboxRepository;
        this.objectMapper = objectMapper;
        this.importDir = Path.of(importDir).toAbsolutePath().normalize();
    }

    @Transactional
    public PdfImportJobResponse create(UUID userId, String fileReference, byte[] sourcePdf) {
        if (sourcePdf == null || sourcePdf.length == 0) {
            throw new IllegalArgumentException("A PDF source document is required");
        }
        Instant now = Instant.now();
        PdfImportJob job = repository.saveAndFlush(PdfImportJob.builder()
                .userId(userId)
                .status(PdfImportJobStatus.PENDING)
                .fileReference(fileReference)
                .sourcePdf(sourcePdf.clone())
                .build());
        saveOutboxEvent(job, now);
        return toResponse(job);
    }

    @Transactional(readOnly = true)
    public PdfImportJobResponse getForUser(UUID jobId, UUID userId) {
        return repository.findByIdAndUserId(jobId, userId)
                .map(PdfImportJobService::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("PDF import job was not found"));
    }

    @Transactional(readOnly = true)
    public PagedResponse<PdfImportJobResponse> listForUser(UUID userId, Pageable pageable) {
        return PagedResponse.from(repository.findAllByUserId(userId, pageable),
                PdfImportJobService::toResponse);
    }

    @Transactional
    public PdfImportJobResponse retry(UUID jobId, UUID userId) {
        PdfImportJob job = repository.findByIdAndUserIdForUpdate(jobId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("PDF import job was not found"));
        if (job.getStatus() != PdfImportJobStatus.FAILED) {
            throw new IllegalArgumentException("Only failed PDF import jobs can be retried");
        }
        if (job.getSourcePdf() == null || job.getSourcePdf().length == 0) {
            throw new IllegalArgumentException("The source PDF is no longer available for retry");
        }

        Path destination = resolveImportPath(job.getFileReference());
        try {
            Files.createDirectories(importDir);
            Files.write(destination, job.getSourcePdf());
        } catch (IOException writeFailure) {
            throw new IllegalStateException("Could not restore the PDF for retry", writeFailure);
        }
        registerRollbackCleanup(destination);

        job.setStatus(PdfImportJobStatus.PENDING);
        job.setFailureReason(null);
        saveOutboxEvent(job, Instant.now());
        return toResponse(job);
    }

    @Transactional
    public PdfImportJobResponse updateStatus(UUID jobId, PdfImportJobStatus requestedStatus,
                                             String failureReason) {
        if (requestedStatus == PdfImportJobStatus.PENDING) {
            throw new IllegalArgumentException("An import job can only be marked COMPLETED or FAILED");
        }

        PdfImportJob job = repository.findByIdForUpdate(jobId)
                .orElseThrow(() -> new ResourceNotFoundException("PDF import job was not found"));

        // Completion wins over a delayed failure callback. A FAILED job may become COMPLETED if an
        // operator safely replays its dead-lettered message.
        if (job.getStatus() != PdfImportJobStatus.COMPLETED
                && (job.getStatus() != PdfImportJobStatus.FAILED
                || requestedStatus == PdfImportJobStatus.COMPLETED)) {
            job.setStatus(requestedStatus);
            job.setFailureReason(requestedStatus == PdfImportJobStatus.FAILED
                    ? normalizeFailureReason(failureReason)
                    : null);
            if (requestedStatus == PdfImportJobStatus.COMPLETED) {
                job.setSourcePdf(null);
            }
        }
        return toResponse(job);
    }

    private void saveOutboxEvent(PdfImportJob job, Instant now) {
        PdfImportRequestedPayload payload = new PdfImportRequestedPayload(
                job.getId(), job.getUserId(), job.getFileReference());
        try {
            outboxRepository.save(OutboxEvent.builder()
                    .aggregateId(job.getId())
                    .aggregateType(PdfImportRequestedPayload.AGGREGATE_TYPE)
                    .eventType(PdfImportRequestedPayload.EVENT_TYPE)
                    .payload(objectMapper.writeValueAsString(payload))
                    .createdAt(now)
                    .attempts(0)
                    .nextAttemptAt(now)
                    .build());
        } catch (Exception serializationFailure) {
            throw new IllegalStateException("Could not create the PDF import outbox event",
                    serializationFailure);
        }
    }

    private Path resolveImportPath(String fileReference) {
        Path resolved = importDir.resolve(fileReference).normalize();
        if (!resolved.startsWith(importDir)) {
            throw new IllegalArgumentException("PDF file reference escapes the import directory");
        }
        return resolved;
    }

    private void registerRollbackCleanup(Path destination) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status == STATUS_COMMITTED) {
                    return;
                }
                try {
                    Files.deleteIfExists(destination);
                } catch (IOException cleanupFailure) {
                    log.error("Could not clean up rolled-back PDF retry {}", destination.getFileName(),
                            cleanupFailure);
                }
            }
        });
    }

    private static String normalizeFailureReason(String reason) {
        if (reason == null || reason.isBlank()) {
            return "PDF import processing failed";
        }
        String normalized = reason.trim();
        return normalized.length() <= 1000 ? normalized : normalized.substring(0, 1000);
    }

    private static PdfImportJobResponse toResponse(PdfImportJob job) {
        return new PdfImportJobResponse(job.getId(), job.getStatus(), job.getFailureReason(),
                job.getCreatedAt(), job.getUpdatedAt());
    }
}
