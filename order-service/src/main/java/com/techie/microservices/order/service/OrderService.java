package com.techie.microservices.order.service;

import com.techie.microservices.order.client.InventoryClient;
import com.techie.microservices.order.dto.OrderCreateRequestDto;
import com.techie.microservices.order.event.OrderPlacedEvent;
import com.techie.microservices.order.mapper.OrderMapper;
import com.techie.microservices.order.model.Order;
import com.techie.microservices.order.model.OrderItem;
import com.techie.microservices.order.repository.OrderRepository;
import com.techie.microservices.order.repository.OrderItemRepository;
import com.techie.microservices.order.vo.OrderResponseVo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrderService {
    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final InventoryClient inventoryClient;
    private final KafkaTemplate<String, OrderPlacedEvent> kafkaTemplate;
    private final OrderMapper orderMapper;

    @Transactional
    public OrderResponseVo placeOrder(OrderCreateRequestDto orderCreateRequestDto) {
        validateRequest(orderCreateRequestDto);
        for (OrderCreateRequestDto.OrderItemRequestDto item : orderCreateRequestDto.items()) {
            var stockResponse = inventoryClient.isInStock(item.skuCode(), item.quantity());
            if (!stockResponse.inStock()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Product with skuCode " + item.skuCode() + " is not in stock");
            }
        }

        String orderNumber = UUID.randomUUID().toString();
        Order order = orderMapper.toEntity(orderCreateRequestDto, orderNumber);
        orderRepository.save(order);

        List<OrderItem> orderItems = orderCreateRequestDto.items().stream()
                .map(item -> orderMapper.toEntity(order, item))
                .map(orderItemRepository::save)
                .toList();

        if (orderCreateRequestDto.customerDetails() != null) {
            OrderPlacedEvent orderPlacedEvent = new OrderPlacedEvent();
            orderPlacedEvent.setOrderNumber(order.getOrderNumber());
            orderPlacedEvent.setEmail(orderCreateRequestDto.customerDetails().email());
            orderPlacedEvent.setFirstName(orderCreateRequestDto.customerDetails().firstName());
            orderPlacedEvent.setLastName(orderCreateRequestDto.customerDetails().lastName());
            log.info("Start - Sending OrderPlacedEvent {} to Kafka topic order-placed", orderPlacedEvent);
            kafkaTemplate.send("order-placed", orderPlacedEvent);
            log.info("End - Sending OrderPlacedEvent {} to Kafka topic order-placed", orderPlacedEvent);
        }
        return orderMapper.toVo(order, orderItems);
    }

    @Transactional(readOnly = true)
    public List<OrderResponseVo> getOrders(UUID customerId) {
        List<Order> orders = customerId == null
                ? orderRepository.findAll()
                : orderRepository.findAllByCustomerId(customerId.toString());
        return orders.stream()
                .map(order -> orderMapper.toVo(order, orderItemRepository.findAllByOrderId(order.getId())))
                .toList();
    }

    private void validateRequest(OrderCreateRequestDto orderCreateRequestDto) {
        if (orderCreateRequestDto.customerId() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Customer id is required");
        }
        if (orderCreateRequestDto.items() == null || orderCreateRequestDto.items().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one order item is required");
        }
    }
}
