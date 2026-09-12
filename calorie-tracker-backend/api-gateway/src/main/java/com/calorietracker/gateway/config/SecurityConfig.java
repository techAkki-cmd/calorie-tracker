package com.calorietracker.gateway.config;

import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.NimbusReactiveJwtDecoder;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder;
import org.springframework.security.web.server.SecurityWebFilterChain;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;

@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {

    @Bean
    SecretKey jwtSigningKey(@Value("${jwt.secret}") String secret) {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    @Bean
    ReactiveJwtDecoder jwtDecoder(SecretKey jwtSigningKey) {
        return NimbusReactiveJwtDecoder.withSecretKey(jwtSigningKey)
                .macAlgorithm(macAlgorithmOf(jwtSigningKey))
                .build();
    }

    @Bean
    SecurityWebFilterChain securityWebFilterChain(ServerHttpSecurity http) {
        return http
                .csrf(ServerHttpSecurity.CsrfSpec::disable)
                .httpBasic(ServerHttpSecurity.HttpBasicSpec::disable)
                .formLogin(ServerHttpSecurity.FormLoginSpec::disable)
                .authorizeExchange(exchanges -> exchanges
                        .pathMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .pathMatchers("/api/auth/**").permitAll()
                        .anyExchange().authenticated())
                .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))
                .build();
    }

    /**
     * jjwt derives the MAC strength from the secret length, so the algorithm must be read off the
     * key rather than assumed to be HS256 or every token is rejected as an invalid algorithm.
     */
    private static MacAlgorithm macAlgorithmOf(SecretKey key) {
        return switch (key.getAlgorithm()) {
            case "HmacSHA256" -> MacAlgorithm.HS256;
            case "HmacSHA384" -> MacAlgorithm.HS384;
            case "HmacSHA512" -> MacAlgorithm.HS512;
            default -> throw new IllegalStateException(
                    "Unsupported JWT signing algorithm: " + key.getAlgorithm());
        };
    }
}
