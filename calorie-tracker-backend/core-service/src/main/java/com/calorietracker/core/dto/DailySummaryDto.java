package com.calorietracker.core.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record DailySummaryDto(
        LocalDate date,
        Integer totalCalories,
        BigDecimal totalProtein,
        BigDecimal totalCarbs,
        BigDecimal totalFat
) {
}
