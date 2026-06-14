package com.techie.microservices.notification.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.techie.microservices.notification.client.ShopClient;
import com.techie.microservices.notification.vo.ShopNotificationResponseVo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShopNotificationRealtimeService implements MessageListener {
    private static final long EMITTER_TIMEOUT_MS = 30 * 60 * 1000L;

    private final ShopClient shopClient;
    private final ObjectMapper objectMapper;
    private final ConcurrentHashMap<String, Set<SseEmitter>> emittersByShopId = new ConcurrentHashMap<>();

    public SseEmitter subscribeCurrentShop(String authorization) {
        UUID shopId = shopClient.getCurrentShop(authorization).shopId();
        SseEmitter emitter = new SseEmitter(EMITTER_TIMEOUT_MS);
        String shopIdValue = shopId.toString();

        emittersByShopId.computeIfAbsent(shopIdValue, ignored -> ConcurrentHashMap.newKeySet()).add(emitter);
        emitter.onCompletion(() -> removeEmitter(shopIdValue, emitter));
        emitter.onTimeout(() -> removeEmitter(shopIdValue, emitter));
        emitter.onError(ignored -> removeEmitter(shopIdValue, emitter));

        try {
            emitter.send(SseEmitter.event().name("connected").data("ok"));
        } catch (IOException ex) {
            removeEmitter(shopIdValue, emitter);
        }

        return emitter;
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {
        try {
            String payload = new String(message.getBody(), StandardCharsets.UTF_8);
            ShopNotificationResponseVo notification = objectMapper.readValue(payload, ShopNotificationResponseVo.class);
            sendToShop(notification.shopId().toString(), notification);
        } catch (Exception ex) {
            log.warn("Failed to deliver shop notification from Redis Pub/Sub", ex);
        }
    }

    private void sendToShop(String shopId, ShopNotificationResponseVo notification) {
        Set<SseEmitter> emitters = emittersByShopId.get(shopId);
        if (emitters == null || emitters.isEmpty()) {
            return;
        }

        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name("notification").data(notification));
            } catch (IOException | IllegalStateException ex) {
                removeEmitter(shopId, emitter);
            }
        }
    }

    private void removeEmitter(String shopId, SseEmitter emitter) {
        Set<SseEmitter> emitters = emittersByShopId.get(shopId);
        if (emitters == null) {
            return;
        }
        emitters.remove(emitter);
        if (emitters.isEmpty()) {
            emittersByShopId.remove(shopId, emitters);
        }
    }
}