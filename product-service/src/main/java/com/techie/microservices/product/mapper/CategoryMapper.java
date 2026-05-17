package com.techie.microservices.product.mapper;

import com.techie.microservices.product.dto.CategoryRequestDto;
import com.techie.microservices.product.model.Category;
import com.techie.microservices.product.vo.CategoryResponseVo;
import org.springframework.stereotype.Component;

@Component
public class CategoryMapper {

    public Category toEntity(CategoryRequestDto categoryRequestDto, Category parent) {
        return Category.builder()
                .name(categoryRequestDto.name())
                .parent(parent)
                .build();
    }

    public CategoryResponseVo toVo(Category category) {
        return new CategoryResponseVo(
                category.getId(),
                category.getName(),
                category.getParent() != null ? category.getParent().getId() : null,
                category.getCreatedAt(),
                category.getUpdatedAt()
        );
    }
}
