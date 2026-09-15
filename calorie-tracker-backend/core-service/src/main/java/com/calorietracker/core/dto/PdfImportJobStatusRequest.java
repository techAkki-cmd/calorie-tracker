package com.calorietracker.core.dto;

import com.calorietracker.core.model.PdfImportJobStatus;
import jakarta.validation.constraints.NotNull;

public record PdfImportJobStatusRequest(@NotNull PdfImportJobStatus status) {
}
