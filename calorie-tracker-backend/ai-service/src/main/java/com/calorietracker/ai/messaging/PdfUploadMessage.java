package com.calorietracker.ai.messaging;

import java.util.UUID;

/**
 * Wire contract for pdf.upload.queue, mirroring core-service's record of the same name. The field
 * names must stay in step with the producer.
 */
public record PdfUploadMessage(UUID jobId, UUID userId, String fileReference) {
}
