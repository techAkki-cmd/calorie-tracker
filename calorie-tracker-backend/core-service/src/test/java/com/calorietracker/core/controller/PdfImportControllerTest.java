package com.calorietracker.core.controller;

import com.calorietracker.core.dto.PdfImportJobResponse;
import com.calorietracker.core.model.PdfImportJobStatus;
import com.calorietracker.core.service.PdfImportJobService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class PdfImportControllerTest {
    @TempDir Path directory;

    @Test
    void retainsQueuedFileUntilConsumerReadsIt() throws Exception {
        UUID userId = UUID.randomUUID();
        UUID jobId = UUID.randomUUID();
        var jobs = mock(PdfImportJobService.class);
        when(jobs.create(org.mockito.ArgumentMatchers.eq(userId), anyString()))
                .thenReturn(new PdfImportJobResponse(
                jobId, PdfImportJobStatus.PENDING, java.time.Instant.now()));
        var controller = new PdfImportController(directory.toString(), jobs);
        var result = controller.importPdf(userId,
                new MockMultipartFile("file", "diary.pdf", "application/pdf", new byte[] {1, 2}));
        assertThat(result.jobId()).isEqualTo(jobId);
        try (var files = Files.list(directory)) {
            assertThat(files.filter(path -> path.getFileName().toString().endsWith(".pdf"))).hasSize(1);
        }
    }

    @Test
    void removesFileWhenOutboxTransactionFails() throws Exception {
        UUID userId = UUID.randomUUID();
        var jobs = mock(PdfImportJobService.class);
        when(jobs.create(org.mockito.ArgumentMatchers.eq(userId), anyString()))
                .thenThrow(new IllegalStateException("database unavailable"));
        var controller = new PdfImportController(directory.toString(), jobs);
        assertThatThrownBy(() -> controller.importPdf(userId,
                new MockMultipartFile("file", "diary.pdf", "application/pdf", new byte[] {1, 2})))
                .isInstanceOf(IllegalStateException.class);
        try (var files = Files.list(directory)) {
            assertThat(files).isEmpty();
        }
    }
}
