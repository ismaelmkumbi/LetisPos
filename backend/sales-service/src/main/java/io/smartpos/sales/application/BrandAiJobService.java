package io.smartpos.sales.application;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.smartpos.common.context.TenantContext;
import io.smartpos.sales.domain.model.BrandAiJob;
import io.smartpos.sales.domain.repository.BrandAiJobRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * Lifecycle helpers for brand-AI async jobs. The async-actually-async
 * execution will land in a follow-up (worker thread / queue); for now
 * the service supports the synchronous "completed on create" path so
 * the frontend polling contract works end-to-end.
 */
@Service
@RequiredArgsConstructor
public class BrandAiJobService {

    private final BrandAiJobRepository repo;
    private final ObjectMapper om = new ObjectMapper();

    public BrandAiJob create(String kind, Map<String, Object> request) {
        return repo.save(BrandAiJob.builder()
            .id(UUID.randomUUID())
            .tenantId(TenantContext.require())
            .kind(kind)
            .status("PENDING")
            .request(toJson(request))
            .build());
    }

    @Transactional
    public BrandAiJob markRunning(UUID jobId) {
        BrandAiJob j = repo.findById(jobId).orElseThrow();
        j.setStatus("RUNNING");
        return repo.save(j);
    }

    @Transactional
    public BrandAiJob complete(UUID jobId, Map<String, Object> result) {
        BrandAiJob j = repo.findById(jobId).orElseThrow();
        j.setStatus("COMPLETED");
        j.setResult(toJson(result));
        return repo.save(j);
    }

    @Transactional
    public BrandAiJob fail(UUID jobId, String message) {
        BrandAiJob j = repo.findById(jobId).orElseThrow();
        j.setStatus("FAILED");
        j.setErrorMsg(message);
        return repo.save(j);
    }

    public Optional<BrandAiJob> getForTenant(UUID jobId) {
        UUID tenantId = TenantContext.require();
        return repo.findById(jobId)
            .filter(j -> tenantId.equals(j.getTenantId()));
    }

    public List<BrandAiJob> list(String statusFilter) {
        UUID tenantId = TenantContext.require();
        return statusFilter == null || statusFilter.isBlank()
            ? repo.findByTenantIdOrderByCreatedAtDesc(tenantId)
            : repo.findByTenantIdAndStatusOrderByCreatedAtDesc(tenantId, statusFilter);
    }

    public Map<String, Object> toDto(BrandAiJob j) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", j.getId());
        m.put("kind", j.getKind());
        m.put("status", j.getStatus());
        m.put("request", fromJson(j.getRequest()));
        m.put("result", fromJson(j.getResult()));
        m.put("errorMsg", j.getErrorMsg());
        m.put("createdAt", j.getCreatedAt());
        m.put("updatedAt", j.getUpdatedAt());
        return m;
    }

    private String toJson(Map<String, Object> m) {
        try { return m == null ? null : om.writeValueAsString(m); }
        catch (Exception e) { return null; }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> fromJson(String s) {
        if (s == null || s.isBlank()) return null;
        try { return om.readValue(s, Map.class); }
        catch (Exception e) { return Map.of("_raw", s); }
    }
}
