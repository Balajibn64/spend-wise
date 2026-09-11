package com.spendwise.service;

import com.spendwise.dto.request.LoginRequest;
import com.spendwise.dto.request.SignupRequest;
import com.spendwise.dto.response.AuthResponse;
import com.spendwise.dto.response.UserResponse;
import com.spendwise.exception.BadRequestException;
import com.spendwise.exception.DuplicateResourceException;
import com.spendwise.model.RefreshToken;
import com.spendwise.model.User;
import com.spendwise.repository.RefreshTokenRepository;
import com.spendwise.repository.UserRepository;
import com.spendwise.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final RefreshTokenRepository refreshTokenRepository;

    /** Pairs the response body with the raw refresh token, which the controller sets as an HttpOnly cookie. */
    public record TokenPair(AuthResponse response, String refreshToken) {
    }

    @Transactional
    public TokenPair signup(SignupRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Email already registered");
        }

        User user = User.builder()
                .name(request.getName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .build();

        user = userRepository.save(user);
        return issueTokens(user);
    }

    @Transactional
    public TokenPair login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadRequestException("Invalid credentials"));

        return issueTokens(user);
    }

    @Transactional
    public TokenPair refresh(String rawRefreshToken) {
        if (rawRefreshToken == null || !tokenProvider.validateToken(rawRefreshToken)
                || !tokenProvider.isRefreshToken(rawRefreshToken)) {
            throw new BadRequestException("Invalid or expired refresh token");
        }

        UUID jti = tokenProvider.getJtiFromToken(rawRefreshToken);
        RefreshToken stored = refreshTokenRepository.findById(jti)
                .orElseThrow(() -> new BadRequestException("Invalid or expired refresh token"));

        if (!stored.isActive(LocalDateTime.now())) {
            throw new BadRequestException("Invalid or expired refresh token");
        }

        // Rotate: the old refresh token can never be used again, so a copy that
        // leaks (log, XSS, shared device) has a single-use window.
        stored.setRevokedAt(LocalDateTime.now());
        refreshTokenRepository.save(stored);

        User user = stored.getUser();
        return issueTokens(user);
    }

    @Transactional
    public void logout(String rawRefreshToken) {
        if (rawRefreshToken == null || !tokenProvider.validateToken(rawRefreshToken)
                || !tokenProvider.isRefreshToken(rawRefreshToken)) {
            return;
        }
        UUID jti = tokenProvider.getJtiFromToken(rawRefreshToken);
        refreshTokenRepository.findById(jti).ifPresent(stored -> {
            stored.setRevokedAt(LocalDateTime.now());
            refreshTokenRepository.save(stored);
        });
    }

    @Transactional
    public void logoutAll(UUID userId) {
        refreshTokenRepository.revokeAllActiveForUser(userId, LocalDateTime.now());
    }

    public long getRefreshTokenExpirationSeconds() {
        return tokenProvider.getRefreshTokenExpirationMillis() / 1000;
    }

    private TokenPair issueTokens(User user) {
        String accessToken = tokenProvider.generateAccessToken(user.getId(), user.getEmail());

        UUID jti = UUID.randomUUID();
        String refreshToken = tokenProvider.generateRefreshToken(user.getId(), user.getEmail(), jti);

        LocalDateTime expiresAt = LocalDateTime.now()
                .plusSeconds(tokenProvider.getRefreshTokenExpirationMillis() / 1000);
        refreshTokenRepository.save(RefreshToken.builder()
                .id(jti)
                .user(user)
                .expiresAt(expiresAt)
                .build());

        AuthResponse response = AuthResponse.builder()
                .accessToken(accessToken)
                .tokenType("Bearer")
                .user(UserResponse.from(user))
                .build();

        return new TokenPair(response, refreshToken);
    }
}
