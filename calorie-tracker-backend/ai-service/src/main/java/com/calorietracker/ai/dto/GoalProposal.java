package com.calorietracker.ai.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record GoalProposal(
        Integer dailyCalorieTarget,
        Double proteinTarget,
        Double carbTarget,
        Double fatTarget,
        Double targetWeight
) {
}
