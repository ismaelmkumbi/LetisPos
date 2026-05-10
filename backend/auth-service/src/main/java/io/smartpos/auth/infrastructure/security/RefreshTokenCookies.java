package io.smartpos.auth.infrastructure.security;

import io.smartpos.auth.infrastructure.config.JwtProperties;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
public class RefreshTokenCookies {

    private final JwtProperties props;

    public RefreshTokenCookies(JwtProperties props) {
        this.props = props;
    }

    public String name() {
        return props.refreshCookieName();
    }

    public ResponseCookie attach(String rawRefreshToken) {
        long maxAgeSec = Duration.ofDays(props.refreshTokenTtlDays()).toSeconds();
        var b = ResponseCookie.from(props.refreshCookieName(), rawRefreshToken)
                .httpOnly(true)
                .path("/api/v1/auth")
                .maxAge(maxAgeSec)
                .sameSite("Lax");
        if (props.refreshCookieSecure()) {
            b = b.secure(true);
        }
        return b.build();
    }

    public ResponseCookie clear() {
        var b = ResponseCookie.from(props.refreshCookieName(), "")
                .httpOnly(true)
                .path("/api/v1/auth")
                .maxAge(0)
                .sameSite("Lax");
        if (props.refreshCookieSecure()) {
            b = b.secure(true);
        }
        return b.build();
    }
}
