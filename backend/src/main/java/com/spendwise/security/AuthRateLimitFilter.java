package com.spendwise.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.spendwise.dto.response.ApiResponse;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Fixed-window rate limiter for the unauthenticated auth endpoints
 * (login/signup/refresh), keyed by client IP. In-memory and per-instance —
 * adequate for a single backend instance; a multi-instance deployment would
 * need a shared store (e.g. Redis) instead.
 */
@Component
@RequiredArgsConstructor
public class AuthRateLimitFilter extends OncePerRequestFilter {

    private static final int MAX_REQUESTS_PER_WINDOW = 20;
    private static final Duration WINDOW = Duration.ofMinutes(1);

    private final ObjectMapper objectMapper;

    private record Window(AtomicInteger count, Instant windowStart) {
    }

    private final Map<String, Window> windowsByKey = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                     FilterChain filterChain) throws ServletException, IOException {
        String path = request.getRequestURI();
        boolean limited = path.endsWith("/api/auth/login")
                || path.endsWith("/api/auth/signup")
                || path.endsWith("/api/auth/refresh");

        if (limited && isOverLimit(clientKey(request))) {
            response.setStatus(429); // HttpServletResponse has no SC_TOO_MANY_REQUESTS constant
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            objectMapper.writeValue(response.getOutputStream(),
                    ApiResponse.error("Too many requests. Please try again in a minute."));
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean isOverLimit(String key) {
        Instant now = Instant.now();
        Window window = windowsByKey.compute(key, (k, existing) -> {
            if (existing == null || Duration.between(existing.windowStart(), now).compareTo(WINDOW) >= 0) {
                return new Window(new AtomicInteger(1), now);
            }
            existing.count().incrementAndGet();
            return existing;
        });
        return window.count().get() > MAX_REQUESTS_PER_WINDOW;
    }

    private String clientKey(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
