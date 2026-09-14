package com.calorietracker.ai.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/**
 * Fallback shape when the model wraps the diary array instead of returning it at the root.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record NutritionDiaryEnvelope(@jakarta.validation.constraints.NotEmpty List<@jakarta.validation.Valid @jakarta.validation.constraints.NotNull NutritionDiaryItem> items) {
}
