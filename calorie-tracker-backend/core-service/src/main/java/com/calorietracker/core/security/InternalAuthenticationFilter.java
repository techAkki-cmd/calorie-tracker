package com.calorietracker.core.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Collections;

/** Authenticates trusted callers before controllers consume their user identity headers. */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class InternalAuthenticationFilter extends OncePerRequestFilter {
    private static final String HEADER = "X-Internal-Secret";
    private final byte[] expectedSecret;

    public InternalAuthenticationFilter(@Value("${INTERNAL_API_KEY}") String secret) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalArgumentException("INTERNAL_API_KEY must not be blank");
        }
        expectedSecret = secret.getBytes(StandardCharsets.UTF_8);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        var values = Collections.list(request.getHeaders(HEADER));
        if (values.size() != 1 || !MessageDigest.isEqual(expectedSecret,
                values.getFirst().getBytes(StandardCharsets.UTF_8))) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            return;
        }
        chain.doFilter(request, response);
    }
}
