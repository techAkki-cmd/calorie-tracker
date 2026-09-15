package com.calorietracker.core.messaging;

import com.calorietracker.core.model.OutboxEvent;
import com.calorietracker.core.repository.OutboxEventRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.time.Instant;

@Service
@Slf4j
public class OutboxEventProcessor {

    private static final int MAX_BACKOFF_EXPONENT = 8;

    private final OutboxEventRepository outboxRepository;
    private final PdfUploadProducer pdfUploadProducer;
    private final ObjectMapper objectMapper;

    private final int batchSize;

    public OutboxEventProcessor(OutboxEventRepository outboxRepository,
                                PdfUploadProducer pdfUploadProducer,
                                ObjectMapper objectMapper,
                                @Value("${outbox.publisher.batch-size}") int batchSize) {
        if (batchSize < 1 || batchSize > 1000) {
            throw new IllegalArgumentException("Outbox publisher batch size must be between 1 and 1000");
        }
        this.outboxRepository = outboxRepository;
        this.pdfUploadProducer = pdfUploadProducer;
        this.objectMapper = objectMapper;
        this.batchSize = batchSize;
    }

    @Transactional
    public int publishNextBatch() {
        Instant now = Instant.now();
        var events = outboxRepository.lockNextBatch(now, batchSize);
        for (OutboxEvent event : events) {
            publish(event, now);
        }
        return events.size();
    }

    private void publish(OutboxEvent event, Instant now) {
        try {
            if (!PdfImportRequestedPayload.EVENT_TYPE.equals(event.getEventType())) {
                throw new IllegalArgumentException("Unsupported outbox event type: " + event.getEventType());
            }
            PdfImportRequestedPayload payload = objectMapper.readValue(
                    event.getPayload(), PdfImportRequestedPayload.class);
            pdfUploadProducer.sendPdfForProcessing(
                    payload.jobId(), payload.userId(), payload.fileReference());
            event.setProcessedAt(now);
            event.setLastError(null);
            log.info("Published outbox event {} for PDF import job {}", event.getId(), payload.jobId());
        } catch (Exception publicationFailure) {
            int attempts = event.getAttempts() + 1;
            event.setAttempts(attempts);
            event.setLastError(abbreviate(publicationFailure.getMessage()));
            event.setNextAttemptAt(now.plus(retryDelay(attempts)));
            log.warn("Outbox event {} publication failed on attempt {}; it will be retried",
                    event.getId(), attempts, publicationFailure);
        }
    }

    private static Duration retryDelay(int attempts) {
        int exponent = Math.min(Math.max(attempts - 1, 0), MAX_BACKOFF_EXPONENT);
        return Duration.ofSeconds(1L << exponent);
    }

    private static String abbreviate(String message) {
        if (message == null || message.isBlank()) {
            return "Unknown publication failure";
        }
        return message.length() <= 1000 ? message : message.substring(0, 1000);
    }
}
