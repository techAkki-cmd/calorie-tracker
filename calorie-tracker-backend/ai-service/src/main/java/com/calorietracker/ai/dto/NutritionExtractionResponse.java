package com.calorietracker.ai.dto;

public record NutritionExtractionResponse(
        Integer calories,
        Double protein,
        Double carbs,
        Double fat
) {
}
