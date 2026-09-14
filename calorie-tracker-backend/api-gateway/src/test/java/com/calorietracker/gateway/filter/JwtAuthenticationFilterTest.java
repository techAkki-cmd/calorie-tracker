package com.calorietracker.gateway.filter;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.mock.http.server.reactive.MockServerHttpRequest;
import org.springframework.mock.web.server.MockServerWebExchange;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

class JwtAuthenticationFilterTest {

    private static final String SECRET = "dev-only-secret-change-me-at-least-32-bytes-long";
    private static final SecretKey KEY = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));

    private final JwtAuthenticationFilter filter = new JwtAuthenticationFilter(KEY, "test-internal-key");
    private final AtomicReference<ServerWebExchange> routed = new AtomicReference<>();

    @Test
    void appendsUserIdHeaderForValidToken() {
        String userId = UUID.randomUUID().toString();
        MockServerWebExchange exchange = exchangeWithAuth("/api/goals", "Bearer " + token(userId));

        filter.filter(exchange, this::capture).block();

        assertThat(routed.get().getRequest().getHeaders().getFirst("X-User-Id")).isEqualTo(userId);
    }

    @Test
    void overwritesClientSuppliedUserIdHeader() {
        String userId = UUID.randomUUID().toString();
        MockServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest
                .get("/api/goals")
                .header(HttpHeaders.AUTHORIZATION, "Bearer " + token(userId))
                .header("X-User-Id", "spoofed-value")
                .header("X-Internal-Secret", "attacker-key", "another-key"));

        filter.filter(exchange, this::capture).block();

        assertThat(routed.get().getRequest().getHeaders().get("X-User-Id")).containsExactly(userId);
        assertThat(routed.get().getRequest().getHeaders().get("X-Internal-Secret"))
                .containsExactly("test-internal-key");
    }

    @Test
    void unauthorizedWhenHeaderMissing() {
        MockServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest.get("/api/goals"));

        filter.filter(exchange, this::capture).block();

        assertThat(routed.get()).isNull();
        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void unauthorizedWhenSignatureDoesNotMatch() {
        SecretKey otherKey = Keys.hmacShaKeyFor("a-completely-different-secret-value-of-48-bytes!!".getBytes(StandardCharsets.UTF_8));
        String foreignToken = Jwts.builder()
                .subject("attacker@example.com")
                .claim("userId", UUID.randomUUID().toString())
                .expiration(Date.from(Instant.now().plusSeconds(60)))
                .signWith(otherKey)
                .compact();
        MockServerWebExchange exchange = exchangeWithAuth("/api/goals", "Bearer " + foreignToken);

        filter.filter(exchange, this::capture).block();

        assertThat(routed.get()).isNull();
        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void unauthorizedWhenTokenExpired() {
        String expired = Jwts.builder()
                .subject("user@example.com")
                .claim("userId", UUID.randomUUID().toString())
                .expiration(Date.from(Instant.now().minusSeconds(60)))
                .signWith(KEY)
                .compact();
        MockServerWebExchange exchange = exchangeWithAuth("/api/goals", "Bearer " + expired);

        filter.filter(exchange, this::capture).block();

        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void unauthorizedWhenUserIdClaimAbsent() {
        String noClaim = Jwts.builder()
                .subject("user@example.com")
                .expiration(Date.from(Instant.now().plusSeconds(60)))
                .signWith(KEY)
                .compact();
        MockServerWebExchange exchange = exchangeWithAuth("/api/goals", "Bearer " + noClaim);

        filter.filter(exchange, this::capture).block();

        assertThat(exchange.getResponse().getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void allowsAuthRoutesWithoutTokenAndStripsUserIdHeader() {
        MockServerWebExchange exchange = MockServerWebExchange.from(MockServerHttpRequest
                .post("/api/auth/login")
                .header("X-User-Id", "spoofed-value"));

        filter.filter(exchange, this::capture).block();

        assertThat(routed.get()).isNotNull();
        assertThat(routed.get().getRequest().getHeaders().getFirst("X-User-Id")).isNull();
        assertThat(routed.get().getRequest().getHeaders().get("X-Internal-Secret"))
                .containsExactly("test-internal-key");
    }

    private Mono<Void> capture(ServerWebExchange exchange) {
        routed.set(exchange);
        return Mono.empty();
    }

    private static MockServerWebExchange exchangeWithAuth(String path, String authorization) {
        return MockServerWebExchange.from(MockServerHttpRequest.get(path)
                .header(HttpHeaders.AUTHORIZATION, authorization));
    }

    private static String token(String userId) {
        return Jwts.builder()
                .subject("user@example.com")
                .claim("userId", userId)
                .issuedAt(Date.from(Instant.now()))
                .expiration(Date.from(Instant.now().plusSeconds(600)))
                .signWith(KEY)
                .compact();
    }
}
