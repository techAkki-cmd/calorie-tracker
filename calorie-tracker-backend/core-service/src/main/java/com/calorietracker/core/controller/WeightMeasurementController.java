package com.calorietracker.core.controller;

import com.calorietracker.core.dto.PagedResponse;
import com.calorietracker.core.dto.WeightMeasurementRequest;
import com.calorietracker.core.dto.WeightMeasurementResponse;
import com.calorietracker.core.service.WeightMeasurementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/weight")
@RequiredArgsConstructor
public class WeightMeasurementController {

    private final WeightMeasurementService service;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WeightMeasurementResponse record(@RequestHeader("X-User-Id") UUID userId,
                                             @Valid @RequestBody WeightMeasurementRequest request) {
        return service.record(userId, request);
    }

    @GetMapping
    public PagedResponse<WeightMeasurementResponse> list(
            @RequestHeader("X-User-Id") UUID userId,
            @PageableDefault(size = 30, sort = "timestamp", direction = Sort.Direction.DESC)
            Pageable pageable) {
        return service.list(userId, pageable);
    }

    @DeleteMapping("/{measurementId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@RequestHeader("X-User-Id") UUID userId,
                       @PathVariable UUID measurementId) {
        service.delete(userId, measurementId);
    }
}
