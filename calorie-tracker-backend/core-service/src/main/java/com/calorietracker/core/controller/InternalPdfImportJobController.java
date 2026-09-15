package com.calorietracker.core.controller;

import com.calorietracker.core.dto.PdfImportJobResponse;
import com.calorietracker.core.dto.PdfImportJobStatusRequest;
import com.calorietracker.core.service.PdfImportJobService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/internal/import-jobs")
@RequiredArgsConstructor
public class InternalPdfImportJobController {

    private final PdfImportJobService jobService;

    @PatchMapping("/{jobId}")
    public PdfImportJobResponse updateStatus(@PathVariable UUID jobId,
                                             @Valid @RequestBody PdfImportJobStatusRequest request) {
        return jobService.updateStatus(jobId, request.status());
    }
}
