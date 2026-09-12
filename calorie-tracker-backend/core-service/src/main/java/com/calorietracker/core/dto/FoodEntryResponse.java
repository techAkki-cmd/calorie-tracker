package com.calorietracker.core.dto;

import com.calorietracker.core.model.MealType;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.UUID;

public record FoodEntryResponse(
        UUID id,
        UUID userId,
        String name,
        MealType mealType,
        String quantity,
        Integer calories,
        BigDecimal protein,
        BigDecimal carbs,
        BigDecimal fat,
        String micronutrientSummary,
        LocalDateTime consumedAt,
        Instant createdAt,
        Instant updatedAt
) {
}
