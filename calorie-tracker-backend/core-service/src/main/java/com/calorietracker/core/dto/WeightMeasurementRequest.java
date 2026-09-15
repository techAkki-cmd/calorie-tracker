package com.calorietracker.core.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;

import java.math.BigDecimal;
import java.time.Instant;

public record WeightMeasurementRequest(
        @NotNull @PastOrPresent Instant timestamp,
        @NotNull @DecimalMin("1.0") @DecimalMax("1000.0")
        @Digits(integer = 4, fraction = 2) BigDecimal value
) {
}
