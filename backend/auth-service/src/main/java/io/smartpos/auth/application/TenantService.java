package io.smartpos.auth.application;

import io.smartpos.auth.domain.model.BillingPlan;
import io.smartpos.auth.domain.model.Tenant;
import io.smartpos.auth.domain.model.TenantStatus;
import io.smartpos.auth.domain.repository.TenantRepository;
import io.smartpos.auth.infrastructure.audit.AuditClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.text.Normalizer;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TenantService {

    private final TenantRepository tenantRepository;
    private final AuditClient auditClient;

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
                .status(TenantStatus.TRIAL)
                .billingPlan(plan != null ? plan : BillingPlan.STARTER)
                .build();
        tenant.deriveLimits();
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
            tenant.deriveLimits();
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

    @Transactional
    public Tenant suspend(UUID id, String reason) {
        Tenant tenant = getById(id);
        if (tenant.getStatus() == TenantStatus.SUSPENDED) {
            throw new IllegalStateException("Tenant is already suspended");
        }
        tenant.setStatus(TenantStatus.SUSPENDED);
        tenant.setStatusChangedAt(Instant.now());
        tenant.setStatusReason(reason);
        log.warn("Tenant suspended: id={}, reason={}", id, reason);
        auditClient.send("auth-service", null, "admin", "ADMIN",
                "tenant.suspended", "tenant", id.toString(), tenant.getName(),
                tenant.getId(), null);
        return tenantRepository.save(tenant);
    }

    @Transactional
    public Tenant reactivate(UUID id) {
        Tenant tenant = getById(id);
        if (tenant.getStatus() != TenantStatus.SUSPENDED && tenant.getStatus() != TenantStatus.TRIAL_EXPIRED) {
            throw new IllegalStateException("Tenant is not suspended or trial-expired");
        }
        tenant.setStatus(TenantStatus.ACTIVE);
        tenant.setStatusChangedAt(Instant.now());
        tenant.setStatusReason(null);
        log.info("Tenant reactivated: id={}", id);
        auditClient.send("auth-service", null, "admin", "ADMIN",
                "tenant.reactivated", "tenant", id.toString(), tenant.getName(),
                tenant.getId(), null);
        return tenantRepository.save(tenant);
    }

    @Transactional
    public Tenant close(UUID id, String reason) {
        Tenant tenant = getById(id);
        tenant.setStatus(TenantStatus.CLOSED);
        tenant.setStatusChangedAt(Instant.now());
        tenant.setStatusReason(reason);
        log.warn("Tenant closed: id={}, reason={}", id, reason);
        auditClient.send("auth-service", null, "admin", "ADMIN",
                "tenant.closed", "tenant", id.toString(), tenant.getName(),
                tenant.getId(), null);
        return tenantRepository.save(tenant);
    }

    @Transactional
    public Tenant handleTrialExpiry(UUID id) {
        Tenant tenant = getById(id);
        if (tenant.getStatus() == TenantStatus.TRIAL && tenant.isTrialExpired()) {
            tenant.setStatus(TenantStatus.TRIAL_EXPIRED);
            tenant.setBillingPlan(BillingPlan.FREE);
            tenant.deriveLimits();
            tenant.setStatusChangedAt(Instant.now());
            tenant.setStatusReason("Trial period ended");
            log.info("Trial expired for tenant: id={}", id);
            return tenantRepository.save(tenant);
        }
        return tenant;
    }

    @Transactional
    public Tenant markPastDue(UUID id) {
        Tenant tenant = getById(id);
        if (tenant.getStatus() != TenantStatus.ACTIVE) {
            throw new IllegalStateException("Only active tenants can become past due");
        }
        tenant.setStatus(TenantStatus.PAST_DUE);
        tenant.setStatusChangedAt(Instant.now());
        tenant.setStatusReason("Payment failed");
        log.warn("Tenant marked past due: id={}", id);
        return tenantRepository.save(tenant);
    }

    @Transactional
    public Tenant restoreFromPastDue(UUID id) {
        Tenant tenant = getById(id);
        if (tenant.getStatus() != TenantStatus.PAST_DUE) {
            throw new IllegalStateException("Tenant is not past due");
        }
        tenant.setStatus(TenantStatus.ACTIVE);
        tenant.setStatusChangedAt(Instant.now());
        tenant.setStatusReason(null);
        log.info("Tenant restored from past due: id={}", id);
        return tenantRepository.save(tenant);
    }

    @Transactional
    public int expireTrials() {
        List<Tenant> expiredTrials = tenantRepository
                .findByStatusAndTrialEndsAtBefore(TenantStatus.TRIAL, Instant.now());
        for (Tenant t : expiredTrials) {
            handleTrialExpiry(t.getId());
        }
        return expiredTrials.size();
    }

    @Transactional
    public int suspendPastDueAccounts() {
        Instant cutoff = Instant.now().minus(7, ChronoUnit.DAYS);
        List<Tenant> pastDue = tenantRepository
                .findByStatusAndStatusChangedAtBefore(TenantStatus.PAST_DUE, cutoff);
        for (Tenant t : pastDue) {
            t.setStatus(TenantStatus.SUSPENDED);
            t.setStatusChangedAt(Instant.now());
            t.setStatusReason("Payment grace period expired");
            tenantRepository.save(t);
        }
        return pastDue.size();
    }
}
