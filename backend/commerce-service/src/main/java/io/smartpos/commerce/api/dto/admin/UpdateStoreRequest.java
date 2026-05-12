package io.smartpos.commerce.api.dto.admin;

import jakarta.validation.constraints.NotBlank;

public record UpdateStoreRequest(
    @NotBlank String name,
    String contactEmail, String contactPhone,
    String addressLine1, String addressLine2,
    String city, String state, String country, String postalCode,
    String currency, String timezone, String taxDisplay,
    String socialFacebook, String socialInstagram, String socialTwitter,
    String orderPrefix
) {}
