package com.calorietracker.core.service;

import com.calorietracker.core.dto.DailySummaryDto;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class AnalyticsServiceTest {

    @Test
    void fillsSevenDaysWithZerosInTheGaps() {
        LocalDate start = LocalDate.of(2026, 9, 7);
        LocalDate end = LocalDate.of(2026, 9, 13);
        DailySummaryDto wednesday = new DailySummaryDto(
                LocalDate.of(2026, 9, 9),
                540,
                new BigDecimal("31.5"),
                new BigDecimal("44"),
                new BigDecimal("22.2"));

        List<DailySummaryDto> days = AnalyticsService.fillMissingDays(List.of(wednesday), start, end);

        assertThat(days).hasSize(7);
        assertThat(days.getFirst().date()).isEqualTo(start);
        assertThat(days.getLast().date()).isEqualTo(end);
        assertThat(days.get(2).totalCalories()).isEqualTo(540);
        assertThat(days.get(2).totalProtein()).isEqualByComparingTo("31.50");
        assertThat(days.get(0).totalCalories()).isZero();
        assertThat(days.get(0).totalCarbs()).isEqualByComparingTo("0.00");
        assertThat(days.get(6).totalFat()).isEqualByComparingTo("0.00");
    }

    @Test
    void preservesExistingSumsWhenEveryDayIsPresent() {
        LocalDate start = LocalDate.of(2026, 9, 1);
        List<DailySummaryDto> input = List.of(
                new DailySummaryDto(start, 100, new BigDecimal("1.1"), new BigDecimal("2.2"), new BigDecimal("3.3")),
                new DailySummaryDto(start.plusDays(1), 200, new BigDecimal("4"), new BigDecimal("5"), new BigDecimal("6")));

        List<DailySummaryDto> days = AnalyticsService.fillMissingDays(input, start, start.plusDays(1));

        assertThat(days).hasSize(2);
        assertThat(days.get(0).totalCalories()).isEqualTo(100);
        assertThat(days.get(1).totalCalories()).isEqualTo(200);
        assertThat(days.get(1).totalProtein()).isEqualByComparingTo("4.00");
    }
}
