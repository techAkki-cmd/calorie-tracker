package com.calorietracker.core.service;

import com.calorietracker.core.dto.DailyMacroRow;
import com.calorietracker.core.dto.DailySummaryDto;
import com.calorietracker.core.dto.HealthGoalDto;
import com.calorietracker.core.dto.WeeklyReportDto;
import com.calorietracker.core.model.HealthGoal;
import com.calorietracker.core.repository.FoodEntryRepository;
import com.calorietracker.core.repository.HealthGoalRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private static final int WINDOW_DAYS = 7;
    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2, RoundingMode.UNNECESSARY);

    private final FoodEntryRepository foodEntryRepository;
    private final HealthGoalRepository healthGoalRepository;

    @Transactional(readOnly = true)
    public WeeklyReportDto getWeeklyReport(UUID userId) {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        LocalDate startDate = today.minusDays(WINDOW_DAYS - 1);
        Instant from = startDate.atStartOfDay().toInstant(ZoneOffset.UTC);
        Instant to = today.plusDays(1).atStartOfDay().toInstant(ZoneOffset.UTC);

        List<DailySummaryDto> days = fillMissingDays(
                foodEntryRepository.sumMacrosByDay(userId, from, to).stream()
                        .map(AnalyticsService::toSummary)
                        .toList(),
                startDate,
                today);

        HealthGoalDto goals = healthGoalRepository.findByUserId(userId)
                .map(AnalyticsService::toGoalDto)
                .orElse(null);

        return new WeeklyReportDto(days, goals);
    }

    /**
     * Recharts needs a dense series. Days with no entries become zeros rather than omitted rows.
     */
    static List<DailySummaryDto> fillMissingDays(List<DailySummaryDto> totals,
                                                 LocalDate startInclusive,
                                                 LocalDate endInclusive) {
        Map<LocalDate, DailySummaryDto> byDate = totals.stream()
                .collect(Collectors.toMap(DailySummaryDto::date, Function.identity()));

        List<DailySummaryDto> days = new ArrayList<>();
        for (LocalDate date = startInclusive; !date.isAfter(endInclusive); date = date.plusDays(1)) {
            DailySummaryDto row = byDate.get(date);
            days.add(row == null ? zeroDay(date) : scaled(row));
        }
        return List.copyOf(days);
    }

    private static DailySummaryDto toSummary(DailyMacroRow row) {
        long calories = row.totalCalories() == null ? 0L : row.totalCalories();
        return new DailySummaryDto(
                row.date(),
                Math.toIntExact(calories),
                row.totalProtein(),
                row.totalCarbs(),
                row.totalFat());
    }

    private static DailySummaryDto scaled(DailySummaryDto row) {
        return new DailySummaryDto(
                row.date(),
                row.totalCalories() == null ? 0 : row.totalCalories(),
                scale(row.totalProtein()),
                scale(row.totalCarbs()),
                scale(row.totalFat()));
    }

    private static DailySummaryDto zeroDay(LocalDate date) {
        return new DailySummaryDto(date, 0, ZERO, ZERO, ZERO);
    }

    private static BigDecimal scale(BigDecimal value) {
        if (value == null) {
            return ZERO;
        }
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    private static HealthGoalDto toGoalDto(HealthGoal goal) {
        return new HealthGoalDto(
                goal.getDailyCalorieTarget(),
                scale(goal.getProteinTarget()),
                scale(goal.getCarbTarget()),
                scale(goal.getFatTarget()));
    }
}
