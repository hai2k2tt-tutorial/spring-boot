package com.techie.microservices.notification.service;

import com.techie.microservices.notification.client.ShopClient;
import com.techie.microservices.notification.dto.ShopNotificationCreateCommand;
import com.techie.microservices.notification.event.ShopNotificationPublisher;
import com.techie.microservices.notification.mapper.ShopNotificationMapper;
import com.techie.microservices.notification.model.ShopNotification;
import com.techie.microservices.notification.repository.ShopNotificationRepository;
import com.techie.microservices.notification.vo.ShopNotificationResponseVo;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ShopNotificationService {
    private static final int MAX_LIMIT = 100;

    private final ShopNotificationRepository shopNotificationRepository;
    private final ShopNotificationPublisher shopNotificationPublisher;
    private final ShopNotificationMapper shopNotificationMapper;
    private final ShopClient shopClient;

    @Transactional
    public ShopNotificationResponseVo create(ShopNotificationCreateCommand command) {
        ShopNotification notification = shopNotificationMapper.toEntity(command);
        ShopNotificationResponseVo response = shopNotificationMapper.toVo(shopNotificationRepository.save(notification));
        publishAfterCommit(response);
        return response;
    }

    @Transactional(readOnly = true)
    public List<ShopNotificationResponseVo> getCurrentShopNotifications(String authorization, int limit) {
        String shopId = shopClient.getCurrentShop(authorization).shopId().toString();
        int boundedLimit = Math.max(1, Math.min(limit, MAX_LIMIT));

        return shopNotificationRepository.findByShopIdOrderByCreatedAtDesc(shopId, PageRequest.of(0, boundedLimit))
                .stream()
                .map(shopNotificationMapper::toVo)
                .toList();
    }

    private void publishAfterCommit(ShopNotificationResponseVo notification) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            shopNotificationPublisher.publish(notification);
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                shopNotificationPublisher.publish(notification);
            }
        });
    }
}