package io.smartpos.product.application;

import io.smartpos.common.context.TenantContext;
import io.smartpos.product.api.dto.BrandDto;
import io.smartpos.product.domain.model.Brand;
import io.smartpos.product.domain.repository.BrandRepository;
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
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BrandService {

    private final BrandRepository repo;

    @Transactional(readOnly = true)
    @Cacheable(value = RedisCacheConfig.CACHE_BRAND, key = "'all'")
    public List<BrandDto> list() {
        return repo.findAll().stream().map(BrandDto::from).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<BrandDto> search(String search, Pageable pageable) {
        return repo.search(search, TenantContext.get().orElse(null), pageable).map(BrandDto::from);
    }

    @Transactional(readOnly = true)
    public BrandDto get(UUID id) {
        return repo.findById(id).map(BrandDto::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Brand not found"));
    }

    @Transactional
    @CacheEvict(value = RedisCacheConfig.CACHE_BRAND, allEntries = true)
    public BrandDto create(BrandDto.CreateRequest req) {
        if (repo.existsByNameIgnoreCase(req.name())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Brand name already exists");
        }
        Brand b = Brand.builder().name(req.name()).imageUrl(req.imageUrl()).description(req.description())
                .tenantId(TenantContext.require()).build();
        return BrandDto.from(repo.save(b));
    }

    @Transactional
    @CacheEvict(value = RedisCacheConfig.CACHE_BRAND, allEntries = true)
    public BrandDto update(UUID id, BrandDto.CreateRequest req) {
        Brand b = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Brand not found"));
        b.setName(req.name());
        b.setImageUrl(req.imageUrl());
        b.setDescription(req.description());
        return BrandDto.from(repo.save(b));
    }

    @Transactional
    @CacheEvict(value = RedisCacheConfig.CACHE_BRAND, allEntries = true)
    public void delete(UUID id) { repo.deleteById(id); }
}
