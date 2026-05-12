package io.smartpos.commerce.application;

import io.smartpos.commerce.domain.model.Store;
import io.smartpos.commerce.domain.repository.StoreRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class StoreService {

    private final StoreRepository storeRepository;

    @Transactional
    public Store getOrCreate(UUID tenantId, String name, String slug) {
        return storeRepository.findByTenantId(tenantId)
            .orElseGet(() -> {
                Store store = Store.builder()
                    .tenantId(tenantId)
                    .name(name)
                    .slug(slug)
                    .build();
                return storeRepository.save(store);
            });
    }

    @Transactional(readOnly = true)
    public Store getByTenant(UUID tenantId) {
        return storeRepository.findByTenantId(tenantId)
            .orElseThrow(() -> new StoreNotFoundException(tenantId));
    }

    @Transactional(readOnly = true)
    public Store getBySlug(String slug) {
        return storeRepository.findBySlug(slug)
            .orElseThrow(() -> new StoreNotFoundException("slug: " + slug));
    }

    @Transactional
    public Store update(UUID tenantId, Store updates) {
        Store store = getByTenant(tenantId);
        store.setName(updates.getName());
        store.setContactEmail(updates.getContactEmail());
        store.setContactPhone(updates.getContactPhone());
        store.setAddressLine1(updates.getAddressLine1());
        store.setAddressLine2(updates.getAddressLine2());
        store.setCity(updates.getCity());
        store.setState(updates.getState());
        store.setCountry(updates.getCountry());
        store.setPostalCode(updates.getPostalCode());
        store.setCurrency(updates.getCurrency());
        store.setTimezone(updates.getTimezone());
        store.setTaxDisplay(updates.getTaxDisplay());
        store.setSocialFacebook(updates.getSocialFacebook());
        store.setSocialInstagram(updates.getSocialInstagram());
        store.setSocialTwitter(updates.getSocialTwitter());
        store.setOrderPrefix(updates.getOrderPrefix());
        return storeRepository.save(store);
    }

    @Transactional
    public Store create(UUID tenantId, String name, String slug) {
        if (storeRepository.existsBySlug(slug)) {
            throw new IllegalArgumentException("Store slug '" + slug + "' is already taken");
        }
        Store store = Store.builder()
            .tenantId(tenantId)
            .name(name)
            .slug(slug)
            .build();
        return storeRepository.save(store);
    }

    public static class StoreNotFoundException extends RuntimeException {
        public StoreNotFoundException(UUID tenantId) {
            super("Store not found for tenant: " + tenantId);
        }
        public StoreNotFoundException(String detail) {
            super("Store not found for " + detail);
        }
    }
}
