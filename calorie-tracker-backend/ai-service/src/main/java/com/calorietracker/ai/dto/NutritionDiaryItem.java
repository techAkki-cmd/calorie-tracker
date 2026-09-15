package com.calorietracker.ai.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@JsonIgnoreProperties(ignoreUnknown = true)
public record NutritionDiaryItem(
        @NotBlank @Size(max = 255) String name,
        @NotBlank @Pattern(regexp = "(?i)BREAKFAST|LUNCH|DINNER|SNACKS") String mealType,
        @NotBlank @Size(max = 255) String quantity,
        @NotNull @Min(0) @Max(20000) Integer calories,
        @NotNull @DecimalMin("0") @DecimalMax("9999.99") Double protein,
        @NotNull @DecimalMin("0") @DecimalMax("9999.99") Double carbs,
        @NotNull @DecimalMin("0") @DecimalMax("9999.99") Double fat,
        @NotBlank @Size(max = 1000) String micronutrientSummary,
        @NotBlank String consumedAtISO
) {
}
