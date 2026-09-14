package com.calorietracker.core.controller;

import com.calorietracker.core.messaging.PdfUploadProducer;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;

class PdfImportControllerTest {
    @TempDir Path directory;

    @Test
    void retainsQueuedFileUntilConsumerReadsIt() throws Exception {
        var controller = new PdfImportController(directory.toString(), mock(PdfUploadProducer.class));
        var result = controller.importPdf(UUID.randomUUID(),
                new MockMultipartFile("file", "diary.pdf", "application/pdf", new byte[] {1, 2}));
        assertThat(directory.resolve(result.get("fileReference"))).exists();
    }

    @Test
    void removesFileWhenPublicationFails() throws Exception {
        var producer = mock(PdfUploadProducer.class);
        doThrow(new IllegalStateException("broker unavailable")).when(producer)
                .sendPdfForProcessing(any(), any());
        var controller = new PdfImportController(directory.toString(), producer);
        assertThatThrownBy(() -> controller.importPdf(UUID.randomUUID(),
                new MockMultipartFile("file", "diary.pdf", "application/pdf", new byte[] {1, 2})))
                .isInstanceOf(IllegalStateException.class);
        try (var files = Files.list(directory)) {
            assertThat(files).isEmpty();
        }
    }
}
