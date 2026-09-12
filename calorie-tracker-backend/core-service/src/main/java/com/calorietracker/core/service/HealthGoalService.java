package com.calorietracker.core.service;

import com.calorietracker.core.dto.HealthGoalRequest;
import com.calorietracker.core.dto.HealthGoalResponse;
import com.calorietracker.core.exception.ResourceNotFoundException;
import com.calorietracker.core.model.HealthGoal;
import com.calorietracker.core.repository.HealthGoalRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class HealthGoalService {

    private final HealthGoalRepository healthGoalRepository;

    @Transactional
    public HealthGoalResponse createOrUpdateGoal(UUID userId, HealthGoalRequest request) {
        HealthGoal goal = healthGoalRepository.findByUserId(userId)
                .orElseGet(() -> HealthGoal.builder().userId(userId).build());

        applyTargets(goal, request);

        // flush so Hibernate populates the audit timestamps before the response is built
        return toResponse(healthGoalRepository.saveAndFlush(goal));
    }

    @Transactional(readOnly = true)
    public HealthGoalResponse getGoalByUserId(UUID userId) {
        return healthGoalRepository.findByUserId(userId)
                .map(this::toResponse)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No health goal found for user " + userId));
    }

    private void applyTargets(HealthGoal goal, HealthGoalRequest request) {
        goal.setDailyCalorieTarget(request.dailyCalorieTarget());
        goal.setProteinTarget(request.proteinTarget());
        goal.setCarbTarget(request.carbTarget());
        goal.setFatTarget(request.fatTarget());
        goal.setTargetWeight(request.targetWeight());
    }

    private HealthGoalResponse toResponse(HealthGoal goal) {
        return new HealthGoalResponse(
                goal.getId(),
                goal.getUserId(),
                goal.getDailyCalorieTarget(),
                goal.getProteinTarget(),
                goal.getCarbTarget(),
                goal.getFatTarget(),
                goal.getTargetWeight(),
                goal.getCreatedAt(),
                goal.getUpdatedAt());
    }
}
