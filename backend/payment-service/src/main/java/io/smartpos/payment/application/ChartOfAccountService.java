package io.smartpos.payment.application;

import io.smartpos.payment.api.dto.ChartOfAccountDto;
import io.smartpos.payment.domain.model.AccountClass;
import io.smartpos.payment.domain.model.ChartOfAccount;
import io.smartpos.payment.domain.repository.ChartOfAccountRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ChartOfAccountService {

    private final ChartOfAccountRepository repo;

    @Transactional(readOnly = true)
    public List<ChartOfAccountDto> list(AccountClass cls) {
        List<ChartOfAccount> list = (cls == null)
                ? repo.findByActiveTrueOrderByCodeAsc()
                : repo.findByAccountClassOrderByCodeAsc(cls);
        return list.stream().map(ChartOfAccountDto::from).toList();
    }

    @Transactional(readOnly = true)
    public ChartOfAccountDto get(UUID id) {
        return repo.findById(id).map(ChartOfAccountDto::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));
    }

    @Transactional
    public ChartOfAccountDto create(ChartOfAccountDto.CreateRequest req) {
        if (repo.existsByCodeIgnoreCase(req.code())) {
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
                .build();
        return ChartOfAccountDto.from(repo.save(c));
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
