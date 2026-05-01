package io.smartpos.product.application;

import io.smartpos.product.api.dto.CategoryDto;
import io.smartpos.product.domain.model.Category;
import io.smartpos.product.domain.repository.CategoryRepository;
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
public class CategoryService {

    private final CategoryRepository repo;

    @Transactional(readOnly = true)
    @Cacheable(value = RedisCacheConfig.CACHE_CATEGORY, key = "'all'")
    public List<CategoryDto> list() {
        return repo.findAll().stream().map(CategoryDto::from).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public Page<CategoryDto> search(String search, Pageable pageable) {
        return repo.search(search, pageable).map(CategoryDto::from);
    }

    @Transactional(readOnly = true)
    public CategoryDto get(UUID id) {
        return repo.findById(id).map(CategoryDto::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));
    }

    @Transactional
    @CacheEvict(value = RedisCacheConfig.CACHE_CATEGORY, allEntries = true)
    public CategoryDto create(CategoryDto.CreateRequest req) {
        if (req.code() != null && repo.existsByCodeIgnoreCase(req.code())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Category code already exists");
        }
        Category c = Category.builder()
                .name(req.name())
                .code(req.code())
                .parentId(req.parentId())
                .imageUrl(req.imageUrl())
                .description(req.description())
                .build();
        return CategoryDto.from(repo.save(c));
    }

    @Transactional
    @CacheEvict(value = RedisCacheConfig.CACHE_CATEGORY, allEntries = true)
    public CategoryDto update(UUID id, CategoryDto.CreateRequest req) {
        Category c = repo.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found"));
        c.setName(req.name());
        c.setCode(req.code());
        c.setParentId(req.parentId());
        c.setImageUrl(req.imageUrl());
        c.setDescription(req.description());
        return CategoryDto.from(repo.save(c));
    }

    @Transactional
    @CacheEvict(value = RedisCacheConfig.CACHE_CATEGORY, allEntries = true)
    public void delete(UUID id) { repo.deleteById(id); }
}
