package com.calorietracker.core.controller;

import com.calorietracker.core.dto.HealthGoalRequest;
import com.calorietracker.core.dto.HealthGoalResponse;
import com.calorietracker.core.service.HealthGoalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/goals")
@RequiredArgsConstructor
public class HealthGoalController {

    private final HealthGoalService healthGoalService;

    @PutMapping
    public HealthGoalResponse createOrUpdateGoal(@RequestHeader("X-User-Id") UUID userId,
                                                 @Valid @RequestBody HealthGoalRequest request) {
        return healthGoalService.createOrUpdateGoal(userId, request);
    }

    @GetMapping
    public HealthGoalResponse getGoal(@RequestHeader("X-User-Id") UUID userId) {
        return healthGoalService.getGoalByUserId(userId);
    }
}
