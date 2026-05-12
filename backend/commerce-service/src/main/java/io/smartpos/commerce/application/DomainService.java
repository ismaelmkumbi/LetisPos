package io.smartpos.commerce.application;

import io.smartpos.commerce.domain.model.CustomDomain;
import io.smartpos.commerce.domain.repository.CustomDomainRepository;
import io.smartpos.common.context.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class DomainService {

    private final CustomDomainRepository repository;

    @Transactional(readOnly = true)
    public List<CustomDomain> listDomains(UUID storeId) {
        return repository.findByStoreId(storeId);
    }

    @Transactional
    public CustomDomain addDomain(UUID storeId, String domain) {
        UUID tenantId = TenantContext.require();
        if (repository.findByDomain(domain).isPresent()) {
            throw new IllegalArgumentException("Domain already registered: " + domain);
        }
        String verificationCode = "ltc-verify-" + UUID.randomUUID().toString().substring(0, 8);
        CustomDomain cd = CustomDomain.builder()
            .tenantId(tenantId)
            .storeId(storeId)
            .domain(domain)
            .verificationCode(verificationCode)
            .isVerified(false)
            .isPrimary(false)
            .sslEnabled(false)
            .build();
        return repository.save(cd);
    }

    @Transactional
    public CustomDomain verifyDomain(UUID id) {
        CustomDomain cd = repository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Domain not found"));
        // For MVP, mark as verified without actual DNS TXT record check
        cd.setVerified(true);
        cd.setVerifiedAt(Instant.now());
        return repository.save(cd);
    }

    @Transactional(readOnly = true)
    public CustomDomain getStatus(UUID id) {
        return repository.findById(id)
            .orElseThrow(() -> new IllegalArgumentException("Domain not found"));
    }

    @Transactional
    public void deleteDomain(UUID id) {
        if (!repository.existsById(id)) {
            throw new IllegalArgumentException("Domain not found");
        }
        repository.deleteById(id);
    }

    @Transactional(readOnly = true)
    public CustomDomain resolveByDomain(String domain) {
        return repository.findByDomain(domain)
            .filter(CustomDomain::isVerified)
            .orElseThrow(() -> new IllegalArgumentException("No verified store found for domain: " + domain));
    }
}
