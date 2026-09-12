package com.calorietracker.core.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record HealthGoalRequest(

        @NotNull
        @Min(500)
        @Max(20000)
        Integer dailyCalorieTarget,

        @NotNull
        @DecimalMin("0.0")
        @Digits(integer = 4, fraction = 2)
        BigDecimal proteinTarget,

        @NotNull
        @DecimalMin("0.0")
        @Digits(integer = 4, fraction = 2)
        BigDecimal carbTarget,

        @NotNull
        @DecimalMin("0.0")
        @Digits(integer = 4, fraction = 2)
        BigDecimal fatTarget,

        @DecimalMin("0.0")
        @Digits(integer = 3, fraction = 2)
        BigDecimal targetWeight
) {
}
