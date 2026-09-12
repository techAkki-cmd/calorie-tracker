package com.calorietracker.gateway.config;

import io.jsonwebtoken.Jwts;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.Jwt;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class SecurityConfigTest {

    private static final String SECRET = "dev-only-secret-change-me-at-least-32-bytes-long";

    private final SecurityConfig config = new SecurityConfig();

    @Test
    void decoderAcceptsTokensSignedTheWayIdentityServiceSignsThem() {
        SecretKey key = config.jwtSigningKey(SECRET);
        String userId = UUID.randomUUID().toString();
        String token = Jwts.builder()
                .subject("user@example.com")
                .claim("userId", userId)
                .issuedAt(Date.from(Instant.now()))
                .expiration(Date.from(Instant.now().plusSeconds(600)))
                .signWith(key)
                .compact();

        Jwt decoded = config.jwtDecoder(key).decode(token).block();

        assertThat(decoded).isNotNull();
        assertThat(decoded.getClaimAsString("userId")).isEqualTo(userId);
    }
}
