package com.techie.microservices.product.controller;

import com.techie.microservices.product.dto.ProductRequestDto;
import com.techie.microservices.product.service.ProductService;
import com.techie.microservices.product.vo.ProductResponseVo;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/product")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ProductResponseVo createProduct(@RequestBody ProductRequestDto productRequestDto) {
        return productService.createProduct(productRequestDto);
    }

    @GetMapping
    @ResponseStatus(HttpStatus.OK)
    public List<ProductResponseVo> getAllProducts() {
        return productService.getAllProducts();
    }
}
