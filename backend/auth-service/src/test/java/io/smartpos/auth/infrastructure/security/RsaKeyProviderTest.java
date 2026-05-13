package io.smartpos.auth.infrastructure.security;

import io.smartpos.auth.infrastructure.config.JwtProperties;
import org.junit.jupiter.api.Test;

import java.security.KeyPair;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class RsaKeyProviderTest {

    private final RsaKeyProvider provider = new RsaKeyProvider();

    @Test
    void refusesEphemeralKeysWhenNotExplicitlyAllowed() {
        JwtProperties props = jwtProperties("", "", false);

        assertThrows(IllegalStateException.class, () -> provider.jwtKeyPair(props));
    }

    @Test
    void canGenerateEphemeralKeysForLocalDevelopment() throws Exception {
        JwtProperties props = jwtProperties("", "", true);

        KeyPair keyPair = provider.jwtKeyPair(props);

        assertNotNull(keyPair.getPrivate());
        assertNotNull(keyPair.getPublic());
    }

    @Test
    void refusesPartialKeyConfiguration() {
        JwtProperties props = jwtProperties("/etc/letispos/jwt/private.pem", "", false);

        assertThrows(IllegalStateException.class, () -> provider.jwtKeyPair(props));
    }

    private JwtProperties jwtProperties(String privateKeyPath, String publicKeyPath, boolean allowEphemeralKeys) {
        return new JwtProperties(
                "smartpos-auth",
                60,
                7,
                privateKeyPath,
                publicKeyPath,
                allowEphemeralKeys,
                "smartpos-auth-key-1",
                "smartpos_refresh",
                false
        );
    }
}
