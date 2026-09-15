package com.calorietracker.core.repository;

import com.calorietracker.core.model.WeightMeasurement;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface WeightMeasurementRepository extends JpaRepository<WeightMeasurement, UUID> {
    Page<WeightMeasurement> findAllByUserId(UUID userId, Pageable pageable);

    Optional<WeightMeasurement> findByIdAndUserId(UUID id, UUID userId);
}
