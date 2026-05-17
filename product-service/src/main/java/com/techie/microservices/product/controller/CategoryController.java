package com.techie.microservices.product.controller;

import com.techie.microservices.product.dto.CategoryRequestDto;
import com.techie.microservices.product.service.CategoryService;
import com.techie.microservices.product.vo.CategoryResponseVo;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CategoryResponseVo createCategory(@RequestBody CategoryRequestDto categoryRequestDto) {
        return categoryService.createCategory(categoryRequestDto);
    }

    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public List<CategoryResponseVo> getAllCategories() {
        return categoryService.getAllCategories();
    }
}
