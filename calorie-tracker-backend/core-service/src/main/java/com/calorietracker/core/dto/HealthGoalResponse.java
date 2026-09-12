package com.calorietracker.core.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record HealthGoalResponse(
        UUID id,
        UUID userId,
        Integer dailyCalorieTarget,
        BigDecimal proteinTarget,
        BigDecimal carbTarget,
        BigDecimal fatTarget,
        BigDecimal targetWeight,
        Instant createdAt,
        Instant updatedAt
) {
}
