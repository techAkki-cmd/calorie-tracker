package com.calorietracker.core.controller;

import com.calorietracker.core.dto.PdfImportJobResponse;
import com.calorietracker.core.dto.PagedResponse;
import com.calorietracker.core.service.PdfImportJobService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

@RestController
@RequestMapping("/api/meals")
@Slf4j
public class PdfImportController {

    private final Path importDir;
    private final PdfImportJobService jobService;

    public PdfImportController(@Value("${pdf.import-dir}") String importDir,
                               PdfImportJobService jobService) {
        this.importDir = Path.of(importDir).toAbsolutePath().normalize();
        this.jobService = jobService;
    }

    @PostMapping(value = "/import-pdf", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.ACCEPTED)
    public PdfImportJobResponse importPdf(@RequestHeader("X-User-Id") UUID userId,
                                          @RequestParam("file") MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("A PDF file is required");
        }
        String contentType = file.getContentType();
        if (contentType != null && !contentType.equals(MediaType.APPLICATION_PDF_VALUE)
                && !contentType.equals("application/octet-stream")) {
            throw new IllegalArgumentException("Uploaded file must be a PDF");
        }

        String storedName = UUID.randomUUID() + ".pdf";
        Path destination = importDir.resolve(storedName).normalize();
        if (!destination.startsWith(importDir)) {
            throw new IllegalArgumentException("Invalid import path");
        }
        boolean outboxCommitted = false;
        try {
            Files.createDirectories(importDir);
            byte[] sourcePdf = file.getBytes();
            Files.write(destination, sourcePdf);
            PdfImportJobResponse job = jobService.create(userId, storedName, sourcePdf);
            outboxCommitted = true;
            log.info("Persisted PDF {} as outbox-backed job {} for user {}",
                    storedName, job.jobId(), userId);
            return job;
        } finally {
            // Once the transaction commits, the outbox worker owns publication and file lifecycle.
            if (!outboxCommitted) {
                try {
                    Files.deleteIfExists(destination);
                } catch (IOException cleanupFailure) {
                    log.error("Could not remove unpublished PDF {}", storedName, cleanupFailure);
                }
            }
        }
    }

    @GetMapping("/import-jobs")
    public PagedResponse<PdfImportJobResponse> listImportJobs(
            @RequestHeader("X-User-Id") UUID userId,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC)
            Pageable pageable) {
        return jobService.listForUser(userId, pageable);
    }

    @PostMapping("/import-jobs/{jobId}/retry")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public PdfImportJobResponse retryImport(@RequestHeader("X-User-Id") UUID userId,
                                            @PathVariable UUID jobId) {
        return jobService.retry(jobId, userId);
    }

    @GetMapping("/import-status/{jobId}")
    public ResponseEntity<PdfImportJobResponse> getImportStatus(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable UUID jobId) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(jobService.getForUser(jobId, userId));
    }
}
