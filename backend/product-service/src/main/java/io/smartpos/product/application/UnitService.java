package io.smartpos.product.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.product.api.dto.UnitDto;
import io.smartpos.product.domain.model.Unit;
import io.smartpos.product.domain.repository.UnitRepository;
import io.smartpos.product.infrastructure.config.RedisCacheConfig;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UnitService {

    private final UnitRepository repo;

    @Transactional(readOnly = true)
    @Cacheable(value = RedisCacheConfig.CACHE_UNIT, key = "'all'")
    public List<UnitDto> list() {
        return repo.findAll().stream().map(UnitDto::from).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<UnitDto> search(String search, Pageable pageable) {
        return repo.search(search, TenantContext.get().orElse(null), pageable).map(UnitDto::from);
    }

    @Transactional
    @CacheEvict(value = RedisCacheConfig.CACHE_UNIT, allEntries = true)
    public UnitDto create(UnitDto.CreateRequest req) {
        if (repo.existsByShortNameIgnoreCase(req.shortName())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Unit short_name already exists");
        }
        Unit u = Unit.builder()
                .name(req.name())
                .shortName(req.shortName())
                .baseUnitId(req.baseUnitId())
                .conversionFactor(Optional.ofNullable(req.conversionFactor()).orElse(BigDecimal.ONE))
                .tenantId(TenantContext.require())
                .build();
        return UnitDto.from(repo.save(u));
    }

    @Transactional
    @CacheEvict(value = RedisCacheConfig.CACHE_UNIT, allEntries = true)
    public UnitDto update(UUID id, UnitDto.CreateRequest req) {
        Unit u = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Unit not found"));
        u.setName(req.name());
        u.setShortName(req.shortName());
        u.setBaseUnitId(req.baseUnitId());
        if (req.conversionFactor() != null) u.setConversionFactor(req.conversionFactor());
        return UnitDto.from(repo.save(u));
    }

    @Transactional
    @CacheEvict(value = RedisCacheConfig.CACHE_UNIT, allEntries = true)
    public void delete(UUID id) { repo.deleteById(id); }
}
