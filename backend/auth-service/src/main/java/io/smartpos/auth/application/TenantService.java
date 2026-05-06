package io.smartpos.auth.application;

import io.smartpos.auth.domain.model.BillingPlan;
import io.smartpos.auth.domain.model.Tenant;
import io.smartpos.auth.domain.model.TenantStatus;
import io.smartpos.auth.domain.repository.TenantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.text.Normalizer;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TenantService {

    private final TenantRepository tenantRepository;

    @Transactional
    public Tenant create(String name, String slug, BillingPlan plan) {
        String resolvedSlug = slug != null && !slug.isBlank() ? slug : slugify(name);
        if (tenantRepository.existsBySlugIgnoreCase(resolvedSlug)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A workspace with slug '" + resolvedSlug + "' already exists");
        }
        Tenant tenant = Tenant.builder()
                .name(name)
                .slug(resolvedSlug)
                .status(TenantStatus.ACTIVE)
                .billingPlan(plan != null ? plan : BillingPlan.FREE)
                .maxUsers(planToMaxUsers(plan))
                .maxStores(planToMaxStores(plan))
                .build();
        try {
            tenant = tenantRepository.save(tenant);
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "A workspace with slug '" + resolvedSlug + "' already exists");
        }
        log.info("Tenant created: id={} name={} slug={}", tenant.getId(), tenant.getName(), tenant.getSlug());
        return tenant;
    }

    @Transactional(readOnly = true)
    public Tenant getById(UUID id) {
        return tenantRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tenant not found"));
    }

    @Transactional(readOnly = true)
    public List<Tenant> listAll() {
        return tenantRepository.findAll();
    }

    @Transactional
    public Tenant update(UUID id, Optional<String> name, Optional<String> slug,
                         Optional<BillingPlan> plan) {
        Tenant tenant = getById(id);
        name.ifPresent(tenant::setName);
        slug.ifPresent(s -> {
            if (tenantRepository.existsBySlugIgnoreCase(s) && !tenant.getSlug().equalsIgnoreCase(s)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "A workspace with slug '" + s + "' already exists");
            }
            tenant.setSlug(s);
        });
        plan.ifPresent(p -> {
            tenant.setBillingPlan(p);
            tenant.setMaxUsers(planToMaxUsers(p));
            tenant.setMaxStores(planToMaxStores(p));
        });
        return tenantRepository.save(tenant);
    }

    /**
     * Generate a URL-safe slug from a display name.
     */
    public static String slugify(String name) {
        if (name == null || name.isBlank()) return "workspace";
        String normalised = Normalizer.normalize(name, Normalizer.Form.NFD)
                .replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
        return normalised.trim().toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "")
                .replaceAll("-{2,}", "-");
    }

    private static int planToMaxUsers(BillingPlan plan) {
        if (plan == null) return 5;
        return switch (plan) {
            case FREE -> 5;
            case STARTER -> 20;
            case PRO -> 100;
            case ENTERPRISE -> Integer.MAX_VALUE;
        };
    }

    private static int planToMaxStores(BillingPlan plan) {
        if (plan == null) return 1;
        return switch (plan) {
            case FREE -> 1;
            case STARTER -> 5;
            case PRO -> 25;
            case ENTERPRISE -> Integer.MAX_VALUE;
        };
    }
}
