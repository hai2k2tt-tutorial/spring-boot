package com.techie.microservices.product.controller;

import com.techie.microservices.product.dto.ProductRequestDto;
import com.techie.microservices.product.service.ProductService;
import com.techie.microservices.product.vo.ProductResponseVo;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/product")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProductResponseVo createProduct(@RequestBody ProductRequestDto productRequestDto,
                                           @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) {
        return productService.createProduct(productRequestDto, authorization);
    }

    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public List<ProductResponseVo> getAllProducts() {
        return productService.getAllProducts();
    }

    @GetMapping("/{productId}")
    @ResponseStatus(HttpStatus.OK)
    public ProductResponseVo getProduct(@PathVariable UUID productId) {
        return productService.getProduct(productId);
    }

    @PutMapping
    @ResponseStatus(HttpStatus.OK)
    public ProductResponseVo updateProduct(@RequestBody ProductRequestDto productRequestDto,
                                           @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) {
        return productService.updateProduct(productRequestDto, authorization);
    }
}
