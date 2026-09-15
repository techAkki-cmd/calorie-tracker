package com.calorietracker.core.service;

import com.calorietracker.core.dto.PdfImportJobResponse;
import com.calorietracker.core.exception.ResourceNotFoundException;
import com.calorietracker.core.model.PdfImportJob;
import com.calorietracker.core.model.PdfImportJobStatus;
import com.calorietracker.core.model.OutboxEvent;
import com.calorietracker.core.messaging.PdfImportRequestedPayload;
import com.calorietracker.core.repository.OutboxEventRepository;
import com.calorietracker.core.repository.PdfImportJobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;
import tools.jackson.databind.ObjectMapper;

@Service
@RequiredArgsConstructor
public class PdfImportJobService {

    private final PdfImportJobRepository repository;
    private final OutboxEventRepository outboxRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public PdfImportJobResponse create(UUID userId, String fileReference) {
        Instant now = Instant.now();
        PdfImportJob job = repository.saveAndFlush(PdfImportJob.builder()
                .userId(userId)
                .status(PdfImportJobStatus.PENDING)
                .createdAt(now)
                .build());
        PdfImportRequestedPayload payload = new PdfImportRequestedPayload(
                job.getId(), userId, fileReference);
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
        return toResponse(job);
    }

    @Transactional(readOnly = true)
    public PdfImportJobResponse getForUser(UUID jobId, UUID userId) {
        return repository.findByIdAndUserId(jobId, userId)
                .map(PdfImportJobService::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException("PDF import job was not found"));
    }

    @Transactional
    public PdfImportJobResponse updateStatus(UUID jobId, PdfImportJobStatus requestedStatus) {
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
        }
        return toResponse(job);
    }

    private static PdfImportJobResponse toResponse(PdfImportJob job) {
        return new PdfImportJobResponse(job.getId(), job.getStatus(), job.getCreatedAt());
    }
}
