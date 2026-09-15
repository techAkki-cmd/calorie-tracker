package com.calorietracker.core.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * JPQL constructor row. {@code sum(calories)} is a Long in JPA, so this is mapped to
 * {@link DailySummaryDto} rather than used as the API type.
 */
public interface DailyMacroRow {
    LocalDate getDate();

    Long getTotalCalories();

    BigDecimal getTotalProtein();

    BigDecimal getTotalCarbs();

    BigDecimal getTotalFat();
}
