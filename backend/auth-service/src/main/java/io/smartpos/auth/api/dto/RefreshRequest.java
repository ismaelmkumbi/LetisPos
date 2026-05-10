package io.smartpos.auth.api.dto;

/**
 * Body refresh token is optional when the browser sends an HttpOnly
 * {@code smartpos_refresh} cookie (same-site to the API gateway).
 */
public record RefreshRequest(String refreshToken) {}
