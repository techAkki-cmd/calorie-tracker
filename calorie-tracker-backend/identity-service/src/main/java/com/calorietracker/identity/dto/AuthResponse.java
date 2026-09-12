package com.calorietracker.identity.dto;

public record AuthResponse(
        String token,
        String tokenType,
        long expiresInSeconds,
        UserResponseDto user
) {
}
