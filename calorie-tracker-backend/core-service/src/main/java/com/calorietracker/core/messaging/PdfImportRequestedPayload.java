package com.calorietracker.core.messaging;

import java.util.UUID;

public record PdfImportRequestedPayload(UUID jobId, UUID userId, String fileReference) {
    public static final String AGGREGATE_TYPE = "PdfImportJob";
    public static final String EVENT_TYPE = "PDF_IMPORT_REQUESTED";
}
