package com.techie.microservices.product.mapper;

import com.techie.microservices.product.dto.ProductRequestDto;
import com.techie.microservices.product.model.Category;
import com.techie.microservices.product.model.Product;
import com.techie.microservices.product.model.ProductStatus;
import com.techie.microservices.product.vo.ProductResponseVo;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class ProductMapper {

    public Product toEntity(ProductRequestDto productRequestDto, Category category) {
        return Product.builder()
                .shopId(productRequestDto.shopId())
                .name(productRequestDto.name())
                .description(productRequestDto.description())
                .price(productRequestDto.price())
                .imageUrl(productRequestDto.imageUrl())
                .category(category)
                .status(resolveStatus(productRequestDto.status()))
                .build();
    }

    public ProductResponseVo toVo(Product product) {
        return new ProductResponseVo(
                product.getId(),
                product.getShopId(),
                product.getName(),
                product.getDescription(),
                product.getPrice(),
                product.getImageUrl(),
                product.getCategory().getId(),
                product.getStatus().name(),
                product.getCreatedAt(),
                product.getUpdatedAt(),
                product.getDeletedAt()
        );
    }

    public ProductStatus resolveStatus(String status) {
        if (status == null || status.isBlank()) {
            return ProductStatus.DRAFT;
        }
        try {
            return ProductStatus.valueOf(status.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid product status");
        }
    }
}
