package com.calorietracker.gateway.filter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;

@Component
public class JwtAuthenticationFilter implements GlobalFilter, Ordered {

    private static final String BEARER_PREFIX = "Bearer ";
    private static final String USER_ID_HEADER = "X-User-Id";
    private static final String PUBLIC_PATH_PREFIX = "/api/auth/";

    private final SecretKey jwtSigningKey;
    private final String internalApiKey;

    public JwtAuthenticationFilter(SecretKey jwtSigningKey,
                                   @Value("${INTERNAL_API_KEY}") String internalApiKey) {
        if (internalApiKey == null || internalApiKey.isBlank()) {
            throw new IllegalArgumentException("INTERNAL_API_KEY must not be blank");
        }
        this.jwtSigningKey = jwtSigningKey;
        this.internalApiKey = internalApiKey;
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        String path = exchange.getRequest().getPath().value();
        if (path.startsWith(PUBLIC_PATH_PREFIX)) {
            return chain.filter(withUserId(exchange, null));
        }

        String header = exchange.getRequest().getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
        if (header == null || !header.startsWith(BEARER_PREFIX)) {
            return unauthorized(exchange);
        }

        String userId;
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(jwtSigningKey)
                    .build()
                    .parseSignedClaims(header.substring(BEARER_PREFIX.length()))
                    .getPayload();
            userId = claims.get("userId", String.class);
        } catch (JwtException | IllegalArgumentException ex) {
            return unauthorized(exchange);
        }

        if (userId == null || userId.isBlank()) {
            return unauthorized(exchange);
        }

        return chain.filter(withUserId(exchange, userId));
    }

    @Override
    public int getOrder() {
        return -1;
    }

    /**
     * Replaces any client-supplied {@code X-User-Id} so downstream services can only ever see the
     * value derived from a verified token.
     */
    private ServerWebExchange withUserId(ServerWebExchange exchange, String userId) {
        return exchange.mutate()
                .request(request -> request.headers(headers -> {
                    headers.set("X-Internal-Secret", internalApiKey);
                    if (userId == null) {
                        headers.remove(USER_ID_HEADER);
                    } else {
                        headers.set(USER_ID_HEADER, userId);
                    }
                }))
                .build();
    }

    private static Mono<Void> unauthorized(ServerWebExchange exchange) {
        exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
        return exchange.getResponse().setComplete();
    }
}
