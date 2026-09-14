package com.calorietracker.core.dto;

import com.calorietracker.core.model.MealType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;

public record FoodEntryRequest(

        @NotBlank
        @Size(max = 255)
        String name,

        @NotNull
        MealType mealType,

        @NotBlank
        @Size(max = 255)
        String quantity,

        @NotNull
        @Min(0)
        @Max(20000)
        Integer calories,

        @NotNull
        @DecimalMin("0.0")
        @Digits(integer = 4, fraction = 2)
        BigDecimal protein,

        @NotNull
        @DecimalMin("0.0")
        @Digits(integer = 4, fraction = 2)
        BigDecimal carbs,

        @NotNull
        @DecimalMin("0.0")
        @Digits(integer = 4, fraction = 2)
        BigDecimal fat,

        @Size(max = 1000)
        String micronutrientSummary,

        @NotNull
        @PastOrPresent
        Instant consumedAt,

        @jakarta.validation.constraints.Pattern(regexp = "[a-f0-9]{64}")
        String idempotencyKey
) {
}
