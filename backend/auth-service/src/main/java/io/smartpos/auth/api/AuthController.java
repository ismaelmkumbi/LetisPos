package io.smartpos.auth.api;

import io.smartpos.auth.api.dto.*;
import io.smartpos.auth.application.ChangePasswordUseCase;
import io.smartpos.auth.application.LoginUseCase;
import io.smartpos.auth.application.RegisterUserUseCase;
import io.smartpos.auth.infrastructure.security.RefreshTokenCookies;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final LoginUseCase loginUseCase;
    private final RegisterUserUseCase registerUseCase;
    private final ChangePasswordUseCase changePasswordUseCase;
    private final RefreshTokenCookies refreshCookies;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req, HttpServletRequest httpReq) {
        AuthResponse body = loginUseCase.login(req, httpReq.getHeader("User-Agent"), clientIp(httpReq));
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookies.attach(body.refreshToken()).toString())
                .body(body);
    }

    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(
            @RequestBody(required = false) RefreshRequest req,
            HttpServletRequest httpReq) {
        String raw = coalesceRefresh(readCookie(httpReq, refreshCookies.name()), req);
        if (raw == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing refresh token");
        }
        AuthResponse body = loginUseCase.refresh(raw);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, refreshCookies.attach(body.refreshToken()).toString())
                .body(body);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @RequestBody(required = false) RefreshRequest req,
            HttpServletRequest httpReq) {
        String raw = coalesceRefresh(readCookie(httpReq, refreshCookies.name()), req);
        loginUseCase.logout(raw);
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, refreshCookies.clear().toString())
                .build();
    }

    @PostMapping("/register")
    public ResponseEntity<Map<String, UUID>> register(@Valid @RequestBody RegisterRequest req) {
        UUID id = registerUseCase.register(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("userId", id));
    }

    @PostMapping("/password/change")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@Valid @RequestBody ChangePasswordRequest req) {
        changePasswordUseCase.change(req.userId(), req.currentPassword(), req.newPassword());
    }

    private static String readCookie(HttpServletRequest req, String name) {
        if (req.getCookies() == null) {
            return null;
        }
        for (var c : req.getCookies()) {
            if (name.equals(c.getName())) {
                return c.getValue();
            }
        }
        return null;
    }

    private static String coalesceRefresh(String fromCookie, RefreshRequest req) {
        if (fromCookie != null && !fromCookie.isBlank()) {
            return fromCookie.trim();
        }
        if (req != null && req.refreshToken() != null && !req.refreshToken().isBlank()) {
            return req.refreshToken().trim();
        }
        return null;
    }

    private static String clientIp(HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        return req.getRemoteAddr();
    }
}
