package com.calorietracker.ai.dto;

import java.math.BigDecimal;

/**
 * JSON body posted to core-service {@code PUT /api/goals}. Field names match
 * {@code HealthGoalRequest} so Jackson on the other side binds without a shared module.
 */
public record GoalUpdateRequest(
        Integer dailyCalorieTarget,
        BigDecimal proteinTarget,
        BigDecimal carbTarget,
        BigDecimal fatTarget,
        BigDecimal targetWeight
) {
}
