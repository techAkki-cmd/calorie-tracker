package com.calorietracker.core.service;

import com.calorietracker.core.exception.ResourceNotFoundException;
import com.calorietracker.core.model.PdfImportJob;
import com.calorietracker.core.model.PdfImportJobStatus;
import com.calorietracker.core.repository.PdfImportJobRepository;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PdfImportJobServiceTest {

    @Test
    void statusLookupIsScopedToOwningUser() {
        UUID jobId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        PdfImportJobRepository repository = mock(PdfImportJobRepository.class);
        when(repository.findByIdAndUserId(jobId, userId)).thenReturn(Optional.empty());

        PdfImportJobService service = new PdfImportJobService(repository);

        assertThatThrownBy(() -> service.getForUser(jobId, userId))
                .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void delayedFailureCannotOverwriteCompletion() {
        UUID jobId = UUID.randomUUID();
        PdfImportJob job = job(jobId, PdfImportJobStatus.COMPLETED);
        PdfImportJobRepository repository = mock(PdfImportJobRepository.class);
        when(repository.findByIdForUpdate(jobId)).thenReturn(Optional.of(job));

        PdfImportJobService service = new PdfImportJobService(repository);
        var response = service.updateStatus(jobId, PdfImportJobStatus.FAILED);

        assertThat(response.status()).isEqualTo(PdfImportJobStatus.COMPLETED);
    }

    @Test
    void replayCanPromoteFailedJobToCompleted() {
        UUID jobId = UUID.randomUUID();
        PdfImportJob job = job(jobId, PdfImportJobStatus.FAILED);
        PdfImportJobRepository repository = mock(PdfImportJobRepository.class);
        when(repository.findByIdForUpdate(jobId)).thenReturn(Optional.of(job));

        PdfImportJobService service = new PdfImportJobService(repository);
        var response = service.updateStatus(jobId, PdfImportJobStatus.COMPLETED);

        assertThat(response.status()).isEqualTo(PdfImportJobStatus.COMPLETED);
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
