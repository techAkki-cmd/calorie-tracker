package com.calorietracker.identity.service;

import com.calorietracker.identity.dto.AuthResponse;
import com.calorietracker.identity.dto.LoginRequest;
import com.calorietracker.identity.dto.UserRegistrationRequest;
import com.calorietracker.identity.dto.UserResponseDto;
import com.calorietracker.identity.exception.EmailAlreadyExistsException;
import com.calorietracker.identity.model.User;
import com.calorietracker.identity.repository.UserRepository;
import com.calorietracker.identity.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final String INVALID_CREDENTIALS = "Invalid email or password";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    @Transactional
    public UserResponseDto registerUser(UserRegistrationRequest request) {
        if (userRepository.findByEmail(request.email()).isPresent()) {
            throw new EmailAlreadyExistsException(request.email());
        }

        // flush so Hibernate populates @CreationTimestamp before the DTO is built
        User saved = userRepository.saveAndFlush(User.builder()
                .email(request.email())
                .passwordHash(passwordEncoder.encode(request.password()))
                .build());

        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public AuthResponse loginUser(LoginRequest request) {
        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new BadCredentialsException(INVALID_CREDENTIALS));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException(INVALID_CREDENTIALS);
        }

        String token = jwtUtil.generateToken(user.getEmail(), user.getId().toString());
        return new AuthResponse(token, "Bearer", jwtUtil.getExpirationSeconds(), toDto(user));
    }

    private UserResponseDto toDto(User user) {
        return new UserResponseDto(user.getId(), user.getEmail(), user.getCreatedAt());
    }
}
