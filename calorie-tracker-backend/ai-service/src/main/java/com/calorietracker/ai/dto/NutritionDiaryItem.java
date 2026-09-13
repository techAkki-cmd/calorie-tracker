package com.calorietracker.ai.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record NutritionDiaryItem(
        String name,
        String mealType,
        String quantity,
        Integer calories,
        Double protein,
        Double carbs,
        Double fat
) {
}
