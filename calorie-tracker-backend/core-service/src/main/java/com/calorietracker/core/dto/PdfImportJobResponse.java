package com.calorietracker.core.dto;

import com.calorietracker.core.model.PdfImportJobStatus;

import java.time.Instant;
import java.util.UUID;

public record PdfImportJobResponse(UUID jobId, PdfImportJobStatus status, Instant createdAt) {
}
