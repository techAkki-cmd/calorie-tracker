package com.calorietracker.core.messaging;

import com.calorietracker.core.model.OutboxEvent;
import com.calorietracker.core.repository.OutboxEventRepository;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class OutboxEventProcessorTest {

    @Test
    void marksEventProcessedOnlyAfterConfirmedPublication() throws Exception {
        UUID jobId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        OutboxEvent event = event(jobId, userId);
        OutboxEventRepository repository = mock(OutboxEventRepository.class);
        PdfUploadProducer producer = mock(PdfUploadProducer.class);
        when(repository.lockNextBatch(any(Instant.class), eq(20))).thenReturn(List.of(event));

        int processed = new OutboxEventProcessor(
                repository, producer, new ObjectMapper(), 20).publishNextBatch();

        assertThat(processed).isEqualTo(1);
        verify(producer).sendPdfForProcessing(jobId, userId, "diary.pdf");
        assertThat(event.getProcessedAt()).isNotNull();
        assertThat(event.getAttempts()).isZero();
    }

    @Test
    void schedulesRetryWhenPublicationFails() throws Exception {
        UUID jobId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        OutboxEvent event = event(jobId, userId);
        OutboxEventRepository repository = mock(OutboxEventRepository.class);
        PdfUploadProducer producer = mock(PdfUploadProducer.class);
        when(repository.lockNextBatch(any(Instant.class), eq(20))).thenReturn(List.of(event));
        doThrow(new IllegalStateException("broker unavailable"))
                .when(producer).sendPdfForProcessing(jobId, userId, "diary.pdf");

        new OutboxEventProcessor(repository, producer, new ObjectMapper(), 20).publishNextBatch();

        assertThat(event.getProcessedAt()).isNull();
        assertThat(event.getAttempts()).isEqualTo(1);
        assertThat(event.getNextAttemptAt()).isAfter(event.getCreatedAt());
        assertThat(event.getLastError()).contains("broker unavailable");
    }

    private static OutboxEvent event(UUID jobId, UUID userId) throws Exception {
        Instant createdAt = Instant.now().minusSeconds(1);
        String payload = new ObjectMapper().writeValueAsString(
                new PdfImportRequestedPayload(jobId, userId, "diary.pdf"));
        return OutboxEvent.builder()
                .id(UUID.randomUUID())
                .aggregateId(jobId)
                .aggregateType(PdfImportRequestedPayload.AGGREGATE_TYPE)
                .eventType(PdfImportRequestedPayload.EVENT_TYPE)
                .payload(payload)
                .createdAt(createdAt)
                .attempts(0)
                .nextAttemptAt(createdAt)
                .build();
    }
}
