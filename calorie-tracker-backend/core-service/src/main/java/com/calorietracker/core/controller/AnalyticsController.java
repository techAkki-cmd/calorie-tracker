package com.calorietracker.core.controller;

import com.calorietracker.core.dto.WeeklyReportDto;
import com.calorietracker.core.service.AnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/weekly")
    public WeeklyReportDto weekly(@RequestHeader("X-User-Id") UUID userId) {
        return analyticsService.getWeeklyReport(userId);
    }
}
