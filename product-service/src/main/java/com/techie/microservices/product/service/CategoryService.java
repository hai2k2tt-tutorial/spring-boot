package com.techie.microservices.product.service;

import com.techie.microservices.product.dto.CategoryRequestDto;
import com.techie.microservices.product.mapper.CategoryMapper;
import com.techie.microservices.product.model.Category;
import com.techie.microservices.product.repository.CategoryRepository;
import com.techie.microservices.product.vo.CategoryResponseVo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class CategoryService {
    private final CategoryRepository categoryRepository;
    private final CategoryMapper categoryMapper;

    @Transactional
    public CategoryResponseVo createCategory(CategoryRequestDto categoryRequestDto) {
        Category parent = null;
        if (categoryRequestDto.parentId() != null) {
            parent = categoryRepository.findById(categoryRequestDto.parentId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Parent category not found"));
        }

        Category category = categoryMapper.toEntity(categoryRequestDto, parent);

        categoryRepository.save(category);
        log.info("Category created successfully");
        return categoryMapper.toVo(category);
    }

    @Transactional(readOnly = true)
    public List<CategoryResponseVo> getAllCategories() {
        return categoryRepository.findAll()
                .stream()
                .map(categoryMapper::toVo)
                .toList();
    }
}
