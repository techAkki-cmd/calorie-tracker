package com.calorietracker.core.dto;

import java.util.List;

public record WeeklyReportDto(
        List<DailySummaryDto> days,
        HealthGoalDto goals,
        List<MicronutrientMentionDto> micronutrients
) {
}
