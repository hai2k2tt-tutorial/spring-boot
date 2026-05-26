package com.techie.microservices.product.service;

import com.techie.microservices.product.dto.ProductRequestDto;
import com.techie.microservices.product.mapper.ProductMapper;
import com.techie.microservices.product.model.Category;
import com.techie.microservices.product.model.Product;
import com.techie.microservices.product.repository.CategoryRepository;
import com.techie.microservices.product.repository.ProductRepository;
import com.techie.microservices.product.vo.ProductResponseVo;
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
public class ProductService {
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ProductMapper productMapper;

    @Transactional
    public ProductResponseVo createProduct(ProductRequestDto productRequestDto) {
        Category category = categoryRepository.findById(productRequestDto.categoryId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category not found"));

        Product product = productMapper.toEntity(productRequestDto, category);
        productRepository.save(product);
        log.info("Product created successfully");
        return productMapper.toVo(product);
    }

    @Transactional(readOnly = true)
    public List<ProductResponseVo> getAllProducts() {
        return productRepository.findAll()
                .stream()
                .map(productMapper::toVo)
                .toList();
    }

    @Transactional
    public ProductResponseVo updateProduct(ProductRequestDto productRequestDto) {
        if (productRequestDto.id() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product id is required");
        }

        Product product = productRepository.findById(productRequestDto.id())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));

        Category category = categoryRepository.findById(productRequestDto.categoryId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category not found"));

        product.setShopId(productRequestDto.shopId());
        product.setName(productRequestDto.name());
        product.setDescription(productRequestDto.description());
        product.setPrice(productRequestDto.price());
        product.setImageUrl(productRequestDto.imageUrl());
        product.setCategory(category);
        product.setStatus(productMapper.resolveStatus(productRequestDto.status()));

        return productMapper.toVo(productRepository.save(product));
    }
}
