package com.techie.microservices.notification.controller;

import com.techie.microservices.notification.service.ShopNotificationRealtimeService;
import com.techie.microservices.notification.service.ShopNotificationService;
import com.techie.microservices.notification.vo.ShopNotificationResponseVo;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class ShopNotificationController {
    private final ShopNotificationService shopNotificationService;
    private final ShopNotificationRealtimeService shopNotificationRealtimeService;

    @GetMapping("/shop/me")
    @ResponseStatus(HttpStatus.OK)
    public List<ShopNotificationResponseVo> getCurrentShopNotifications(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestParam(defaultValue = "20") int limit
    ) {
        return shopNotificationService.getCurrentShopNotifications(authorization, limit);
    }

    @GetMapping(value = "/shop/me/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamCurrentShopNotifications(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization
    ) {
        return shopNotificationRealtimeService.subscribeCurrentShop(authorization);
    }
}