package com.calorietracker.core.messaging;

import java.util.UUID;

/**
 * Wire contract for pdf.upload.queue. Deliberately duplicated in ai-service rather than shared,
 * so the two services stay independent; compatibility rests on the JSON field names.
 */
public record PdfUploadMessage(UUID jobId, UUID userId, String fileReference) {
}
