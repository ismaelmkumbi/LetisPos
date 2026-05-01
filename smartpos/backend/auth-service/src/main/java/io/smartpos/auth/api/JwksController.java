package io.smartpos.auth.api;

import io.smartpos.auth.infrastructure.security.JwtTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.security.interfaces.RSAPublicKey;
import java.util.Base64;
import java.util.List;
import java.util.Map;

/**
 * Publishes the RSA public key(s) at /.well-known/jwks.json so other services
 * (Gateway, Product, Inventory, ...) can verify JWT signatures without calling Auth.
 *
 * Conforms to RFC 7517. Only one key for now; extend to List for rotation.
 */
@RestController
@RequiredArgsConstructor
public class JwksController {

    private final JwtTokenService jwtTokenService;

    @GetMapping("/.well-known/jwks.json")
    public Map<String, Object> jwks() {
        RSAPublicKey pk = (RSAPublicKey) jwtTokenService.keyPair().getPublic();
        Map<String, Object> jwk = Map.of(
                "kty", "RSA",
                "use", "sig",
                "alg", "RS256",
                "kid", jwtTokenService.keyId(),
                "n",   b64Url(pk.getModulus().toByteArray()),
                "e",   b64Url(pk.getPublicExponent().toByteArray())
        );
        return Map.of("keys", List.of(jwk));
    }

    private static String b64Url(byte[] bytes) {
        // Strip leading zero byte that BigInteger may add (sign bit).
        int offset = (bytes.length > 0 && bytes[0] == 0) ? 1 : 0;
        byte[] trimmed = new byte[bytes.length - offset];
        System.arraycopy(bytes, offset, trimmed, 0, trimmed.length);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(trimmed);
    }
}
