package com.techie.microservices.inventory.controller;

import com.techie.microservices.inventory.dto.AttributeRequestDto;
import com.techie.microservices.inventory.dto.InventoryDeductRequestDto;
import com.techie.microservices.inventory.dto.InventoryReleaseRequestDto;
import com.techie.microservices.inventory.dto.InventoryReserveRequestDto;
import com.techie.microservices.inventory.dto.SkuRequestDto;
import com.techie.microservices.inventory.service.InventoryService;
import com.techie.microservices.inventory.vo.AttributeResponseVo;
import com.techie.microservices.inventory.vo.InventoryCheckResponseVo;
import com.techie.microservices.inventory.vo.SkuResponseVo;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
public class InventoryController {
    private final InventoryService inventoryService;

    @PostMapping("/attributes")
    @ResponseStatus(HttpStatus.CREATED)
    public AttributeResponseVo createAttribute(@RequestBody AttributeRequestDto attributeRequestDto) {
        return inventoryService.createAttribute(attributeRequestDto);
    }


    @GetMapping("/attributes")
    @ResponseStatus(HttpStatus.OK)
    public List<AttributeResponseVo> getAttributes(@RequestParam UUID productId) {
        return inventoryService.getAttributes(productId);
    }


    @PostMapping("/skus")
    @ResponseStatus(HttpStatus.CREATED)
    public SkuResponseVo createSku(@RequestBody SkuRequestDto skuRequestDto) {
        return inventoryService.createSku(skuRequestDto);
    }

    @GetMapping("/skus")
    @ResponseStatus(HttpStatus.OK)
    public List<SkuResponseVo> getSkus(@RequestParam UUID productId) {
        return inventoryService.getSkus(productId);
    }

    @GetMapping("/skus/{skuCode}")
    @ResponseStatus(HttpStatus.OK)
    public SkuResponseVo getSku(@PathVariable String skuCode) {
        return inventoryService.getSku(skuCode);
    }

    @GetMapping("/stock-check")
    @ResponseStatus(HttpStatus.OK)
    public InventoryCheckResponseVo isInStock(@RequestParam String skuCode, @RequestParam Integer quantity) {
        return inventoryService.isInStock(skuCode, quantity);
    }

    @PostMapping("/deduct")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deductStock(@RequestBody InventoryDeductRequestDto request) {
        inventoryService.deductStock(request);
    }

    @PostMapping("/reserve")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reserveStock(@RequestBody InventoryReserveRequestDto request) {
        inventoryService.reserveStock(request);
    }

    @PostMapping("/release")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void releaseStock(@RequestBody InventoryReleaseRequestDto request) {
        inventoryService.releaseStock(request);
    }
}
