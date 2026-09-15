package com.calorietracker.core.dto;

import com.calorietracker.core.model.PdfImportJobStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record PdfImportJobStatusRequest(
        @NotNull PdfImportJobStatus status,
        @Size(max = 1000) String failureReason
) {
}
