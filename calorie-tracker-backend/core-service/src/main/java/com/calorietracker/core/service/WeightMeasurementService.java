package com.calorietracker.core.service;

import com.calorietracker.core.dto.PagedResponse;
import com.calorietracker.core.dto.WeightMeasurementRequest;
import com.calorietracker.core.dto.WeightMeasurementResponse;
import com.calorietracker.core.exception.ResourceNotFoundException;
import com.calorietracker.core.model.WeightMeasurement;
import com.calorietracker.core.repository.WeightMeasurementRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class WeightMeasurementService {

    private final WeightMeasurementRepository repository;

    @Transactional
    public WeightMeasurementResponse record(UUID userId, WeightMeasurementRequest request) {
        WeightMeasurement measurement = repository.saveAndFlush(WeightMeasurement.builder()
                .userId(userId)
                .timestamp(request.timestamp())
                .value(request.value())
                .build());
        return toResponse(measurement);
    }

    @Transactional(readOnly = true)
    public PagedResponse<WeightMeasurementResponse> list(UUID userId, Pageable pageable) {
        return PagedResponse.from(repository.findAllByUserId(userId, pageable),
                WeightMeasurementService::toResponse);
    }

    @Transactional
    public void delete(UUID userId, UUID measurementId) {
        WeightMeasurement measurement = repository.findByIdAndUserId(measurementId, userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Weight measurement was not found"));
        repository.delete(measurement);
    }

    private static WeightMeasurementResponse toResponse(WeightMeasurement measurement) {
        return new WeightMeasurementResponse(measurement.getId(), measurement.getTimestamp(),
                measurement.getValue(), measurement.getCreatedAt());
    }
}
