package com.calorietracker.core.controller;

import com.calorietracker.core.messaging.PdfUploadProducer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/meals")
@Slf4j
public class PdfImportController {

    private final Path importDir;
    private final PdfUploadProducer pdfUploadProducer;

    public PdfImportController(@Value("${pdf.import-dir}") String importDir,
                               PdfUploadProducer pdfUploadProducer) {
        this.importDir = Path.of(importDir).toAbsolutePath().normalize();
        this.pdfUploadProducer = pdfUploadProducer;
    }

    @PostMapping(value = "/import-pdf", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Map<String, String> importPdf(@RequestHeader("X-User-Id") UUID userId,
                                         @RequestParam("file") MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("A PDF file is required");
        }
        String contentType = file.getContentType();
        if (contentType != null && !contentType.equals(MediaType.APPLICATION_PDF_VALUE)
                && !contentType.equals("application/octet-stream")) {
            throw new IllegalArgumentException("Uploaded file must be a PDF");
        }

        Files.createDirectories(importDir);
        String storedName = UUID.randomUUID() + ".pdf";
        Path destination = importDir.resolve(storedName).normalize();
        if (!destination.startsWith(importDir)) {
            throw new IllegalArgumentException("Invalid import path");
        }
        boolean queued = false;
        try {
            file.transferTo(destination);
            pdfUploadProducer.sendPdfForProcessing(userId, storedName);
            queued = true;
            log.info("Queued PDF {} for user {}", storedName, userId);
            return Map.of("fileReference", storedName, "status", "queued");
        } finally {
            // A queued message contains this path: ownership transfers to the consumer.
            if (!queued) {
                try {
                    Files.deleteIfExists(destination);
                } catch (IOException cleanupFailure) {
                    log.error("Could not remove unpublished PDF {}", storedName, cleanupFailure);
                }
            }
        }
    }
}
