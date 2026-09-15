package com.calorietracker.core.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record WeightMeasurementResponse(
        UUID id,
        Instant timestamp,
        BigDecimal value,
        Instant createdAt
) {
}
