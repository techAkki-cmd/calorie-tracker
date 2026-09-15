package com.calorietracker.core.service;

import com.calorietracker.core.exception.ResourceNotFoundException;
import com.calorietracker.core.messaging.PdfImportRequestedPayload;
import com.calorietracker.core.model.PdfImportJob;
import com.calorietracker.core.model.PdfImportJobStatus;
import com.calorietracker.core.model.OutboxEvent;
import com.calorietracker.core.repository.OutboxEventRepository;
import com.calorietracker.core.repository.PdfImportJobRepository;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class PdfImportJobServiceTest {

    @Test
    void statusLookupIsScopedToOwningUser() {
        UUID jobId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        PdfImportJobRepository repository = mock(PdfImportJobRepository.class);
        when(repository.findByIdAndUserId(jobId, userId)).thenReturn(Optional.empty());

        PdfImportJobService service = service(repository);

        assertThatThrownBy(() -> service.getForUser(jobId, userId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void delayedFailureCannotOverwriteCompletion() {
        UUID jobId = UUID.randomUUID();
        PdfImportJob job = job(jobId, PdfImportJobStatus.COMPLETED);
        PdfImportJobRepository repository = mock(PdfImportJobRepository.class);
        when(repository.findByIdForUpdate(jobId)).thenReturn(Optional.of(job));

        PdfImportJobService service = service(repository);
        var response = service.updateStatus(jobId, PdfImportJobStatus.FAILED);

        assertThat(response.status()).isEqualTo(PdfImportJobStatus.COMPLETED);
    }

    @Test
    void replayCanPromoteFailedJobToCompleted() {
        UUID jobId = UUID.randomUUID();
        PdfImportJob job = job(jobId, PdfImportJobStatus.FAILED);
        PdfImportJobRepository repository = mock(PdfImportJobRepository.class);
        when(repository.findByIdForUpdate(jobId)).thenReturn(Optional.of(job));

        PdfImportJobService service = service(repository);
        var response = service.updateStatus(jobId, PdfImportJobStatus.COMPLETED);

        assertThat(response.status()).isEqualTo(PdfImportJobStatus.COMPLETED);
    }

    @Test
    void createsPendingJobAndOutboxEventTogether() {
        UUID jobId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        PdfImportJobRepository jobs = mock(PdfImportJobRepository.class);
        OutboxEventRepository outbox = mock(OutboxEventRepository.class);
        when(jobs.saveAndFlush(any(PdfImportJob.class))).thenAnswer(invocation -> {
            PdfImportJob job = invocation.getArgument(0);
            job.setId(jobId);
            return job;
        });
        PdfImportJobService service = new PdfImportJobService(jobs, outbox, new ObjectMapper());

        var response = service.create(userId, "stored.pdf");

        assertThat(response.jobId()).isEqualTo(jobId);
        assertThat(response.status()).isEqualTo(PdfImportJobStatus.PENDING);
        ArgumentCaptor<OutboxEvent> eventCaptor = ArgumentCaptor.forClass(OutboxEvent.class);
        verify(outbox).save(eventCaptor.capture());
        OutboxEvent event = eventCaptor.getValue();
        assertThat(event.getAggregateId()).isEqualTo(jobId);
        assertThat(event.getEventType()).isEqualTo(PdfImportRequestedPayload.EVENT_TYPE);
        assertThat(event.getPayload()).contains(jobId.toString(), userId.toString(), "stored.pdf");
    }

    private static PdfImportJobService service(PdfImportJobRepository repository) {
        return new PdfImportJobService(repository, mock(OutboxEventRepository.class),
                new ObjectMapper());
    }

    private static PdfImportJob job(UUID id, PdfImportJobStatus status) {
        return PdfImportJob.builder()
                .id(id)
                .userId(UUID.randomUUID())
                .status(status)
                .createdAt(Instant.now())
                .build();
    }
}
