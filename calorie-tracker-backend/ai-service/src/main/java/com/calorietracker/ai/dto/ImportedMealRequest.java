package com.calorietracker.ai.dto;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * JSON body posted to core-service {@code POST /api/meals/bulk}. Field names match
 * {@code FoodEntryRequest} so Jackson on the other side binds without a shared module.
 */
public record ImportedMealRequest(
        String name,
        String mealType,
        String quantity,
        Integer calories,
        BigDecimal protein,
        BigDecimal carbs,
        BigDecimal fat,
        String micronutrientSummary,
        Instant consumedAt,
        String idempotencyKey
) {
}
