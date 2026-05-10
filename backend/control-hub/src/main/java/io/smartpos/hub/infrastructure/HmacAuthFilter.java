package io.smartpos.hub.infrastructure;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.security.InvalidKeyException;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

@Component
@Slf4j
public class HmacAuthFilter extends OncePerRequestFilter {

    @Value("${hub.agent.secret:change-me}")
    private String sharedSecret;

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getServletPath();
        return !path.startsWith("/api/v1/agents");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain)
            throws ServletException, IOException {
        String ts = request.getHeader("X-LSA-Timestamp");
        String sig = request.getHeader("X-LSA-Signature");

        if (ts == null || sig == null) {
            response.sendError(401, "Missing HMAC headers");
            return;
        }

        long now = System.currentTimeMillis() / 1000;
        long reqTime = Long.parseLong(ts);
        if (Math.abs(now - reqTime) > 300) {
            response.sendError(401, "Timestamp skew too large");
            return;
        }

        String payload = request.getMethod() + request.getRequestURI() + ts;
        String expected = hmacSha256(payload, sharedSecret);
        if (!expected.equals(sig)) {
            response.sendError(401, "Invalid HMAC signature");
            return;
        }

        chain.doFilter(request, response);
    }

    private String hmacSha256(String data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(data.getBytes()));
        } catch (NoSuchAlgorithmException | InvalidKeyException e) {
            throw new RuntimeException(e);
        }
    }
}
