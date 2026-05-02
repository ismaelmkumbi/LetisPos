package io.smartpos.auth.infrastructure.security;

import io.smartpos.auth.infrastructure.config.JwtProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.*;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

/**
 * Provides the RSA key pair used to sign and verify JWT access tokens.
 *
 * Strategy:
 *  - If {@code private-key-path} and {@code public-key-path} are set in config,
 *    read PEM files from disk (production path).
 *  - Otherwise, generate an in-memory 2048-bit key pair on startup.
 *    DEVELOPMENT ONLY — restarting rotates the key and invalidates all tokens.
 *
 * In production, mount the PEMs from a secret store (Vault, K8s Secret, etc.).
 */
@Slf4j
@Configuration
public class RsaKeyProvider {

    @Bean
    public KeyPair jwtKeyPair(JwtProperties props) throws Exception {
        if (props.privateKeyPath() != null && !props.privateKeyPath().isBlank()
                && props.publicKeyPath() != null && !props.publicKeyPath().isBlank()) {
            log.info("Loading JWT key pair from PEM files");
            RSAPrivateKey privateKey = readPrivateKey(props.privateKeyPath());
            RSAPublicKey publicKey = readPublicKey(props.publicKeyPath());
            return new KeyPair(publicKey, privateKey);
        }
        log.warn("No JWT key paths configured — generating an ephemeral 2048-bit RSA key pair. " +
                "Tokens will be invalidated on restart. DEV ONLY.");
        KeyPairGenerator kpg = KeyPairGenerator.getInstance("RSA");
        kpg.initialize(2048, new SecureRandom());
        return kpg.generateKeyPair();
    }

    private RSAPrivateKey readPrivateKey(String path) throws IOException, GeneralSecurityException {
        String pem = Files.readString(Path.of(path));
        String base64 = pem
                .replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replaceAll("\\s", "");
        byte[] der = Base64.getDecoder().decode(base64);
        KeyFactory kf = KeyFactory.getInstance("RSA");
        return (RSAPrivateKey) kf.generatePrivate(new PKCS8EncodedKeySpec(der));
    }

    private RSAPublicKey readPublicKey(String path) throws IOException, GeneralSecurityException {
        String pem = Files.readString(Path.of(path));
        String base64 = pem
                .replace("-----BEGIN PUBLIC KEY-----", "")
                .replace("-----END PUBLIC KEY-----", "")
                .replaceAll("\\s", "");
        byte[] der = Base64.getDecoder().decode(base64);
        KeyFactory kf = KeyFactory.getInstance("RSA");
        return (RSAPublicKey) kf.generatePublic(new X509EncodedKeySpec(der));
    }
}
