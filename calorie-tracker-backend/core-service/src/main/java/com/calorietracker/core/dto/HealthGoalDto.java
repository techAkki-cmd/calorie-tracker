package com.calorietracker.core.dto;

import java.math.BigDecimal;

public record HealthGoalDto(
        Integer dailyCalorieTarget,
        BigDecimal proteinTarget,
        BigDecimal carbTarget,
        BigDecimal fatTarget
) {
}
