package com.calorietracker.core.service;

import com.calorietracker.core.dto.PdfImportJobResponse;
import com.calorietracker.core.exception.ResourceNotFoundException;
import com.calorietracker.core.model.PdfImportJob;
import com.calorietracker.core.model.PdfImportJobStatus;
import com.calorietracker.core.repository.PdfImportJobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PdfImportJobService {

    private final PdfImportJobRepository repository;

    @Transactional
    public PdfImportJobResponse create(UUID userId) {
        PdfImportJob job = repository.save(PdfImportJob.builder()
                .userId(userId)
                .status(PdfImportJobStatus.PENDING)
                .createdAt(Instant.now())
                .build());
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
