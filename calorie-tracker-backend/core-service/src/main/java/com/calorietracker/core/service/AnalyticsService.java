package com.calorietracker.core.service;

import com.calorietracker.core.dto.DailyMacroRow;
import com.calorietracker.core.dto.DailySummaryDto;
import com.calorietracker.core.dto.HealthGoalDto;
import com.calorietracker.core.dto.MicronutrientMentionDto;
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
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private static final int WINDOW_DAYS = 7;
    private static final int MAX_MICRONUTRIENT_MENTIONS = 12;
    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2, RoundingMode.UNNECESSARY);
    private static final Pattern MICRONUTRIENT_SPLIT =
            Pattern.compile("\\s*(?:,|;|/|\\|)|\\band\\b\\s*", Pattern.CASE_INSENSITIVE);
    private static final Pattern MICRONUTRIENT_PREFIX = Pattern.compile(
            "^(high in|low in|low|rich in|good source of|contains)\\s+",
            Pattern.CASE_INSENSITIVE);
    private static final Pattern IGNORED_MICRONUTRIENT = Pattern.compile(
            "^\\s*(no notable micronutrient information|none|n/?a|not available)\\s*$",
            Pattern.CASE_INSENSITIVE);

    private final FoodEntryRepository foodEntryRepository;
    private final HealthGoalRepository healthGoalRepository;

    @Transactional(readOnly = true)
    public WeeklyReportDto getWeeklyReport(UUID userId) {
        return getWeeklyReport(userId, ZoneOffset.UTC);
    }

    @Transactional(readOnly = true)
    public WeeklyReportDto getWeeklyReport(UUID userId, ZoneId timezone) {
        LocalDate today = LocalDate.now(timezone);
        LocalDate startDate = today.minusDays(WINDOW_DAYS - 1);
        Instant from = startDate.atStartOfDay(timezone).toInstant();
        Instant to = today.plusDays(1).atStartOfDay(timezone).toInstant();

        List<DailySummaryDto> days = fillMissingDays(
                foodEntryRepository.sumMacrosByDay(userId, from, to, timezone.getId()).stream()
                        .map(AnalyticsService::toSummary)
                        .toList(),
                startDate,
                today);

        HealthGoalDto goals = healthGoalRepository.findByUserId(userId)
                .map(AnalyticsService::toGoalDto)
                .orElse(null);

        List<MicronutrientMentionDto> micronutrients = aggregateMicronutrients(
                foodEntryRepository.findMicronutrientSummaries(userId, from, to));

        return new WeeklyReportDto(days, goals, micronutrients);
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

    /**
     * Free-text meal micros are split into vitamin/mineral phrases and counted for the week.
     */
    static List<MicronutrientMentionDto> aggregateMicronutrients(List<String> summaries) {
        Map<String, Long> counts = new LinkedHashMap<>();
        Map<String, String> displayLabels = new LinkedHashMap<>();

        for (String summary : summaries) {
            if (summary == null || IGNORED_MICRONUTRIENT.matcher(summary).matches()) {
                continue;
            }
            for (String part : MICRONUTRIENT_SPLIT.split(summary)) {
                String label = normalizeMicronutrientLabel(part);
                if (label.isEmpty() || IGNORED_MICRONUTRIENT.matcher(label).matches()) {
                    continue;
                }
                String key = label.toLowerCase(Locale.ROOT);
                displayLabels.putIfAbsent(key, label);
                counts.merge(key, 1L, Long::sum);
            }
        }

        return counts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue(Comparator.reverseOrder())
                        .thenComparing(entry -> displayLabels.get(entry.getKey())))
                .limit(MAX_MICRONUTRIENT_MENTIONS)
                .map(entry -> new MicronutrientMentionDto(displayLabels.get(entry.getKey()), entry.getValue()))
                .toList();
    }

    private static String normalizeMicronutrientLabel(String value) {
        String trimmed = value == null ? "" : value.trim().replaceAll("\\s+", " ");
        if (trimmed.isEmpty()) {
            return "";
        }
        String withoutPrefix = MICRONUTRIENT_PREFIX.matcher(trimmed).replaceFirst("").trim();
        if (withoutPrefix.isEmpty()) {
            return "";
        }
        return withoutPrefix.substring(0, 1).toUpperCase(Locale.ROOT) + withoutPrefix.substring(1);
    }

    private static DailySummaryDto toSummary(DailyMacroRow row) {
        long calories = row.getTotalCalories() == null ? 0L : row.getTotalCalories();
        return new DailySummaryDto(
                row.getDate(),
                Math.toIntExact(calories),
                row.getTotalProtein(),
                row.getTotalCarbs(),
                row.getTotalFat());
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
