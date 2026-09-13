package com.calorietracker.core.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * JPQL constructor row. {@code sum(calories)} is a Long in JPA, so this is mapped to
 * {@link DailySummaryDto} rather than used as the API type.
 */
public record DailyMacroRow(
        LocalDate date,
        Long totalCalories,
        BigDecimal totalProtein,
        BigDecimal totalCarbs,
        BigDecimal totalFat
) {
}
