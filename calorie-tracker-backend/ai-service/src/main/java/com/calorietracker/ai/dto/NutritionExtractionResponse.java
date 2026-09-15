package com.calorietracker.ai.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record NutritionExtractionResponse(
        @NotBlank @Size(max = 255) String name,
        @NotNull @Min(0) @Max(20000) Integer calories,
        @NotNull @DecimalMin("0") @DecimalMax("9999.99") Double protein,
        @NotNull @DecimalMin("0") @DecimalMax("9999.99") Double carbs,
        @NotNull @DecimalMin("0") @DecimalMax("9999.99") Double fat
) {
}
