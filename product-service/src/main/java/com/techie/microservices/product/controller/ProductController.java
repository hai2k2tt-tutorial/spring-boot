package com.techie.microservices.product.controller;

import com.techie.microservices.product.dto.ProductImagePresignRequestDto;
import com.techie.microservices.product.dto.ProductRequestDto;
import com.techie.microservices.product.service.ProductImageStorageService;
import com.techie.microservices.product.service.ProductService;
import com.techie.microservices.product.util.TokenIdentity;
import com.techie.microservices.product.vo.ProductImagePresignResponseVo;
import com.techie.microservices.product.vo.ProductResponseVo;
import io.minio.GetObjectResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/product")
@RequiredArgsConstructor
public class ProductController {

    private final ProductService productService;
    private final ProductImageStorageService productImageStorageService;
    private final TokenIdentity tokenIdentity;

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

    @PostMapping("/images/presign")
    @ResponseStatus(HttpStatus.CREATED)
    public ProductImagePresignResponseVo createProductImageUploadUrl(@RequestBody ProductImagePresignRequestDto request,
                                                                     @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) {
        UUID shopId = tokenIdentity.currentUserId(authorization);
        return productImageStorageService.createPresignedUpload(shopId, request);
    }

    @GetMapping("/images/{objectName}")
    public ResponseEntity<InputStreamResource> getProductImage(@PathVariable String objectName) {
        GetObjectResponse object = productImageStorageService.getObject(objectName);
        String contentType = object.headers().get("Content-Type");
        MediaType mediaType = contentType == null || contentType.isBlank()
                ? MediaType.APPLICATION_OCTET_STREAM
                : MediaType.parseMediaType(contentType);

        return ResponseEntity.ok()
                .contentType(mediaType)
                .body(new InputStreamResource(object));
    }

    @PutMapping
    @ResponseStatus(HttpStatus.OK)
    public ProductResponseVo updateProduct(@RequestBody ProductRequestDto productRequestDto,
                                           @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization) {
        return productService.updateProduct(productRequestDto, authorization);
    }
}
