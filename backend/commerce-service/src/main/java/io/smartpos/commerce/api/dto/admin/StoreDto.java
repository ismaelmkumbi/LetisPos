package io.smartpos.commerce.api.dto.admin;

import io.smartpos.commerce.domain.model.Store;
import java.util.UUID;

public record StoreDto(
    UUID id, UUID tenantId, String name, String slug, String status,
    String contactEmail, String contactPhone,
    String addressLine1, String addressLine2,
    String city, String state, String country, String postalCode,
    String currency, String timezone, String taxDisplay,
    String socialFacebook, String socialInstagram, String socialTwitter,
    String orderPrefix
) {
    public static StoreDto from(Store store) {
        return new StoreDto(
            store.getId(), store.getTenantId(), store.getName(), store.getSlug(),
            store.getStatus(), store.getContactEmail(), store.getContactPhone(),
            store.getAddressLine1(), store.getAddressLine2(),
            store.getCity(), store.getState(), store.getCountry(), store.getPostalCode(),
            store.getCurrency(), store.getTimezone(), store.getTaxDisplay(),
            store.getSocialFacebook(), store.getSocialInstagram(), store.getSocialTwitter(),
            store.getOrderPrefix()
        );
    }
}
