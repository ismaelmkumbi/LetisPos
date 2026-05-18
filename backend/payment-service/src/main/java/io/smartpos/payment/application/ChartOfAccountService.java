package io.smartpos.payment.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.payment.api.dto.ChartOfAccountDto;
import io.smartpos.payment.domain.model.AccountClass;
import io.smartpos.payment.domain.model.ChartOfAccount;
import io.smartpos.payment.domain.repository.ChartOfAccountRepository;
import io.smartpos.payment.domain.repository.JournalEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChartOfAccountService {

    private final ChartOfAccountRepository repo;
    private final JournalEntryRepository journalRepo;

    @Transactional(readOnly = true)
    public List<ChartOfAccountDto> list(AccountClass cls, boolean includeInactive) {
        UUID tenantId = TenantContext.require();
        List<ChartOfAccount> list;
        if (includeInactive) {
            list = repo.findByTenantIdOrderByCodeAsc(tenantId);
        } else if (cls == null) {
            list = repo.findByActiveTrueAndTenantIdOrderByCodeAsc(tenantId);
        } else {
            list = repo.findByAccountClassAndTenantIdOrderByCodeAsc(cls, tenantId);
        }
        return list.stream().map(ChartOfAccountDto::from).toList();
    }

    /** List inactive template accounts the tenant can activate. */
    @Transactional(readOnly = true)
    public List<ChartOfAccountDto> templates() {
        return repo.findByActiveFalseAndTenantIdOrderByCodeAsc(TenantContext.require())
                .stream().map(ChartOfAccountDto::from).toList();
    }

    /** Activate a previously inactive account. */
    @Transactional
    public ChartOfAccountDto activate(UUID id) {
        ChartOfAccount c = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));
        c.setActive(true);
        return ChartOfAccountDto.from(repo.save(c));
    }

    @Transactional(readOnly = true)
    public ChartOfAccountDto get(UUID id) {
        return repo.findById(id).map(ChartOfAccountDto::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));
    }

    @Transactional
    public ChartOfAccountDto create(ChartOfAccountDto.CreateRequest req) {
        UUID tenantId = TenantContext.require();
        if (repo.existsByCodeIgnoreCaseAndTenantId(req.code(), tenantId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Account code already exists");
        }
        ChartOfAccount c = ChartOfAccount.builder()
                .parentId(req.parentId())
                .code(req.code())
                .name(req.name())
                .accountClass(req.accountClass())
                .normalBalance(Optional.ofNullable(req.normalBalance())
                        .orElse(req.accountClass() == AccountClass.ASSET ||
                                req.accountClass() == AccountClass.EXPENSE ? "DR" : "CR"))
                .postable(req.postable() == null || req.postable())
                .active(req.active() == null || req.active())
                .description(req.description())
                .tenantId(tenantId)
                .build();
        return ChartOfAccountDto.from(repo.save(c));
    }

    public record ChartOfAccountSummary(String code, String name, String type,
                                         BigDecimal balance) {}

    @Transactional(readOnly = true)
    public List<ChartOfAccountSummary> summary() {
        UUID tenantId = TenantContext.require();
        List<ChartOfAccount> accounts = repo.findByActiveTrueAndTenantIdOrderByCodeAsc(tenantId);
        Map<UUID, BigDecimal[]> totals = new HashMap<>();
        for (Object[] row : journalRepo.sumByAccount(null, null, tenantId)) {
            totals.put((UUID) row[0],
                    new BigDecimal[]{ (BigDecimal) row[1], (BigDecimal) row[2] });
        }
        return accounts.stream()
                .map(a -> {
                    BigDecimal[] drcr = totals.getOrDefault(a.getId(),
                            new BigDecimal[]{ BigDecimal.ZERO, BigDecimal.ZERO });
                    BigDecimal net = drcr[0].subtract(drcr[1]);
                    BigDecimal balance = "DR".equals(a.getNormalBalance()) ? net : net.negate();
                    return new ChartOfAccountSummary(
                            a.getCode(), a.getName(), a.getAccountClass().name(), balance);
                })
                .toList();
    }

    @Transactional
    public ChartOfAccountDto update(UUID id, ChartOfAccountDto.UpdateRequest req) {
        ChartOfAccount c = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));
        if (req.name() != null) c.setName(req.name());
        if (req.parentId() != null) c.setParentId(req.parentId());
        if (req.normalBalance() != null) c.setNormalBalance(req.normalBalance());
        if (req.postable() != null) c.setPostable(req.postable());
        if (req.active() != null) c.setActive(req.active());
        if (req.description() != null) c.setDescription(req.description());
        return ChartOfAccountDto.from(repo.save(c));
    }
}
