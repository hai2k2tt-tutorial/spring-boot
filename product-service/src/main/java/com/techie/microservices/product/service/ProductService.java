package com.techie.microservices.product.service;

import com.techie.microservices.product.client.ShopClient;
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
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProductService {
    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final ProductMapper productMapper;
    private final ShopClient shopClient;

    @Transactional
    public ProductResponseVo createProduct(ProductRequestDto productRequestDto, String authorization) {
        if (productRequestDto == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product request is required");
        }
        UUID shopId = shopClient.getCurrentShop(authorization).shopId();
        Category category = categoryRepository.findById(productRequestDto.categoryId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category not found"));

        Product product = productMapper.toEntity(productRequestDto, category, shopId);
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

    @Transactional(readOnly = true)
    public List<ProductResponseVo> getCurrentShopProducts(String authorization) {
        UUID shopId = shopClient.getCurrentShop(authorization).shopId();
        return productRepository.findByShopId(shopId)
                .stream()
                .map(productMapper::toVo)
                .toList();
    }

    @Transactional(readOnly = true)
    public ProductResponseVo getProduct(UUID productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
        return productMapper.toVo(product);
    }

    @Transactional
    public ProductResponseVo updateProduct(ProductRequestDto productRequestDto, String authorization) {
        if (productRequestDto == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product request is required");
        }
        if (productRequestDto.id() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Product id is required");
        }

        UUID shopId = shopClient.getCurrentShop(authorization).shopId();
        Product product = productRepository.findById(productRequestDto.id())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Product not found"));
        if (!product.getShopId().equals(shopId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Product does not belong to current shop");
        }

        Category category = categoryRepository.findById(productRequestDto.categoryId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Category not found"));

        product.setName(productRequestDto.name());
        product.setDescription(productRequestDto.description());
        product.setPrice(productRequestDto.price());
        product.setImageUrl(productRequestDto.imageUrl());
        product.setCategory(category);
        product.setStatus(productMapper.resolveStatus(productRequestDto.status()));

        return productMapper.toVo(productRepository.save(product));
    }
}
