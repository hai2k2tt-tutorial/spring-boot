package com.techie.microservices.order.repository;

import com.techie.microservices.order.model.OrderItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface OrderItemRepository extends JpaRepository<OrderItem, String> {
    List<OrderItem> findAllByOrderId(String orderId);
    List<OrderItem> findAllByShopId(String shopId);

    @Query("select count(oi) > 0 from OrderItem oi where oi.order.id = :orderId and oi.shopId = :shopId")
    boolean existsByOrderIdAndShopId(@Param("orderId") String orderId, @Param("shopId") String shopId);

    @Query("select distinct oi.order.id from OrderItem oi where oi.shopId = :shopId")
    List<String> findDistinctOrderIdsByShopId(@Param("shopId") String shopId);
}
