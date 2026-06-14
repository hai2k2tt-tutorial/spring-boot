# Shop Notification Implementation Guide

This guide moves all shop-notification ownership to `notification-service`.

`order-service` should only publish order business events. `notification-service` should own:

- `t_shop_notification`
- shop notification creation
- shop notification list API
- Redis Pub/Sub realtime fanout
- SSE stream endpoint for `shop-fe`

This keeps notification storage and delivery out of `order-service`, so future flows from product, inventory, wallet, or admin services can reuse the same notification feature.

## Target Flow

```text
order-service
  confirm order paid
  publish ORDER_PAID to Redis Stream order-events with shopIds

notification-service
  consume ORDER_PAID from Redis Stream
  create one t_shop_notification row per shopId
  publish each saved notification to Redis Pub/Sub shop-notifications
  expose GET /api/notifications/shop/me
  expose GET /api/notifications/shop/me/stream

shop-fe
  fetch notifications from notification-service through api-gateway
  connect to SSE stream through api-gateway
```

Redis Stream is used for service-to-service event consumption. Redis Pub/Sub is used only for realtime browser fanout after the database row is saved.

## 1. Update `notification-service/pom.xml`

`notification-service` currently has Redis and web dependencies, but it does not have JPA/Postgres/Liquibase. Add these dependencies:

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
<dependency>
    <groupId>org.liquibase</groupId>
    <artifactId>liquibase-core</artifactId>
</dependency>
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>org.mapstruct</groupId>
    <artifactId>mapstruct</artifactId>
    <version>${mapstruct.version}</version>
</dependency>
```

Keep the existing dependencies:

- `spring-boot-starter-web`
- `spring-boot-starter-data-redis`
- `spring-boot-starter-mail`

Add module properties:

```xml
<properties>
    <mapstruct.version>1.6.3</mapstruct.version>
    <lombok-mapstruct-binding.version>0.2.0</lombok-mapstruct-binding.version>
</properties>
```

Add the compiler plugin so MapStruct and Lombok work together:

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-compiler-plugin</artifactId>
    <configuration>
        <annotationProcessorPaths>
            <path>
                <groupId>org.mapstruct</groupId>
                <artifactId>mapstruct-processor</artifactId>
                <version>${mapstruct.version}</version>
            </path>
            <path>
                <groupId>org.projectlombok</groupId>
                <artifactId>lombok</artifactId>
                <version>${lombok.version}</version>
            </path>
            <path>
                <groupId>org.projectlombok</groupId>
                <artifactId>lombok-mapstruct-binding</artifactId>
                <version>${lombok-mapstruct-binding.version}</version>
            </path>
        </annotationProcessorPaths>
    </configuration>
</plugin>
```

## 2. Update `notification-service/src/main/resources/application.yml`

Remove these exclusions because notification service now needs datasource and JPA:

```yaml
spring:
  autoconfigure:
    exclude:
      - org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration
      - org.springframework.boot.autoconfigure.data.jpa.JpaRepositoriesAutoConfiguration
      - org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration
```

You can keep Mongo exclusions if they are still needed:

```yaml
spring:
  autoconfigure:
    exclude:
      - org.springframework.boot.autoconfigure.data.mongo.MongoDataAutoConfiguration
      - org.springframework.boot.autoconfigure.mongo.MongoAutoConfiguration
```

Add datasource, JPA, Liquibase, shop-service URL, and notification topic:

```yaml
spring:
  application:
    name: notification-service
  datasource:
    url: jdbc:postgresql://localhost:5432/notification_service
    username: postgres
    password: postgres
  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false
  liquibase:
    enabled: true
  data:
    redis:
      host: localhost
      port: 6379

app:
  notifications:
    shop-topic: shop-notifications

shop:
  service:
    url: http://localhost:8086
```

Keep the existing mail, Kafka, management, tracing, and Loki config.

## 3. Add Notification-Service Liquibase Master

Create:

`notification-service/src/main/resources/db/changelog/db.changelog-master.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
        xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
        http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.29.xsd">

    <include file="changes/001-create-shop-notification-table.xml" relativeToChangelogFile="true"/>
</databaseChangeLog>
```

## 4. Add Shop Notification Table Changelog

Create:

`notification-service/src/main/resources/db/changelog/changes/001-create-shop-notification-table.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
        xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        logicalFilePath="src/main/resources/db/changelog/db.changelog-master.xml"
        xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
        http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.29.xsd">

    <changeSet id="1-create-shop-notification-table" author="codex">
        <createTable tableName="t_shop_notification">
            <column name="id" type="VARCHAR(36)">
                <constraints nullable="false" primaryKey="true" primaryKeyName="pk_shop_notification"/>
            </column>
            <column name="shop_id" type="VARCHAR(36)">
                <constraints nullable="false"/>
            </column>
            <column name="type" type="VARCHAR(64)">
                <constraints nullable="false"/>
            </column>
            <column name="title" type="VARCHAR(255)">
                <constraints nullable="false"/>
            </column>
            <column name="content" type="TEXT">
                <constraints nullable="false"/>
            </column>
            <column name="link_url" type="VARCHAR(512)"/>
            <column name="metadata" type="JSONB"/>
            <column name="created_at" type="TIMESTAMP WITH TIME ZONE">
                <constraints nullable="false"/>
            </column>
            <column name="read_at" type="TIMESTAMP WITH TIME ZONE"/>
        </createTable>

        <createIndex tableName="t_shop_notification" indexName="idx_shop_notification_shop_created">
            <column name="shop_id"/>
            <column name="created_at" descending="true"/>
        </createIndex>

        <rollback>
            <dropTable tableName="t_shop_notification"/>
        </rollback>
    </changeSet>
</databaseChangeLog>
```

## 5. Add Entity In Notification Service

Create:

`notification-service/src/main/java/com/techie/microservices/notification/model/ShopNotification.java`

```java
package com.techie.microservices.notification.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(
        name = "t_shop_notification",
        indexes = {
                @Index(name = "idx_shop_notification_shop_created", columnList = "shop_id, created_at")
        }
)
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ShopNotification {
    @Id
    @Column(length = 36, nullable = false)
    private String id;

    @Column(name = "shop_id", nullable = false, length = 36)
    private String shopId;

    @Column(nullable = false, length = 64)
    private String type;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "link_url", length = 512)
    private String linkUrl;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> metadata = new HashMap<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "read_at")
    private Instant readAt;

    @PrePersist
    void prePersist() {
        if (id == null) {
            id = UUID.randomUUID().toString();
        }
        if (createdAt == null) {
            createdAt = Instant.now();
        }
        if (metadata == null) {
            metadata = new HashMap<>();
        }
    }
}
```

The important `jsonb` mapping is:

```java
@JdbcTypeCode(SqlTypes.JSON)
@Column(columnDefinition = "jsonb")
private Map<String, Object> metadata;
```

## 6. Add Repository

Create:

`notification-service/src/main/java/com/techie/microservices/notification/repository/ShopNotificationRepository.java`

```java
package com.techie.microservices.notification.repository;

import com.techie.microservices.notification.model.ShopNotification;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ShopNotificationRepository extends JpaRepository<ShopNotification, String> {
    List<ShopNotification> findByShopIdOrderByCreatedAtDesc(String shopId, Pageable pageable);
}
```

## 7. Add DTOs And VOs

Create:

`notification-service/src/main/java/com/techie/microservices/notification/dto/ShopNotificationCreateCommand.java`

```java
package com.techie.microservices.notification.dto;

import java.util.Map;

public record ShopNotificationCreateCommand(
        String shopId,
        String type,
        String title,
        String content,
        String linkUrl,
        Map<String, Object> metadata
) {
}
```

Create:

`notification-service/src/main/java/com/techie/microservices/notification/dto/ShopResponseDto.java`

```java
package com.techie.microservices.notification.dto;

import java.util.UUID;

public record ShopResponseDto(
        UUID shopId,
        String email,
        String shopName
) {
}
```

Create:

`notification-service/src/main/java/com/techie/microservices/notification/vo/ShopNotificationResponseVo.java`

```java
package com.techie.microservices.notification.vo;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record ShopNotificationResponseVo(
        UUID id,
        UUID shopId,
        String type,
        String title,
        String content,
        String linkUrl,
        Map<String, Object> metadata,
        Instant createdAt,
        Instant readAt
) {
}
```

## 8. Add Shop Client To Notification Service

Create:

`notification-service/src/main/java/com/techie/microservices/notification/client/ShopClient.java`

```java
package com.techie.microservices.notification.client;

import com.techie.microservices.notification.dto.ShopResponseDto;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.service.annotation.GetExchange;

public interface ShopClient {
    @GetExchange("/api/shops/me")
    ShopResponseDto getCurrentShop(@RequestHeader("Authorization") String authorization);
}
```

Create:

`notification-service/src/main/java/com/techie/microservices/notification/config/RestClientConfig.java`

```java
package com.techie.microservices.notification.config;

import com.techie.microservices.notification.client.ShopClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.support.RestClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;

@Configuration
public class RestClientConfig {
    @Value("${shop.service.url}")
    private String shopServiceUrl;

    @Bean
    public ShopClient shopClient() {
        RestClient restClient = RestClient.builder()
                .baseUrl(shopServiceUrl)
                .build();

        HttpServiceProxyFactory factory = HttpServiceProxyFactory
                .builderFor(RestClientAdapter.create(restClient))
                .build();

        return factory.createClient(ShopClient.class);
    }
}
```

`notification-service` uses this client only to resolve the authenticated shop for list and stream endpoints. It should not trust a `shopId` passed from the frontend.

## 9. Add Redis Pub/Sub Publisher

Create:

`notification-service/src/main/java/com/techie/microservices/notification/event/ShopNotificationPublisher.java`

```java
package com.techie.microservices.notification.event;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.techie.microservices.notification.vo.ShopNotificationResponseVo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class ShopNotificationPublisher {
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @Value("${app.notifications.shop-topic:shop-notifications}")
    private String topic;

    public void publish(ShopNotificationResponseVo notification) {
        try {
            redisTemplate.convertAndSend(topic, objectMapper.writeValueAsString(notification));
        } catch (JsonProcessingException ex) {
            log.warn("Failed to serialize shop notification {}", notification.id(), ex);
        } catch (RuntimeException ex) {
            log.warn("Failed to publish shop notification {}", notification.id(), ex);
        }
    }
}
```

Publishing failure should not delete or roll back the saved notification. Shops can reload and read from PostgreSQL.

## 10. Add Shop Notification Mapper With MapStruct

Create:

`notification-service/src/main/java/com/techie/microservices/notification/mapper/ShopNotificationMapper.java`

```java
package com.techie.microservices.notification.mapper;

import com.techie.microservices.notification.dto.ShopNotificationCreateCommand;
import com.techie.microservices.notification.model.ShopNotification;
import com.techie.microservices.notification.vo.ShopNotificationResponseVo;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Mapper(componentModel = "spring")
public interface ShopNotificationMapper {

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "readAt", ignore = true)
    @Mapping(target = "metadata", expression = "java(copyMetadata(command.metadata()))")
    ShopNotification toEntity(ShopNotificationCreateCommand command);

    @Mapping(target = "id", expression = "java(toUuid(notification.getId()))")
    @Mapping(target = "shopId", expression = "java(toUuid(notification.getShopId()))")
    @Mapping(target = "metadata", expression = "java(copyMetadata(notification.getMetadata()))")
    ShopNotificationResponseVo toVo(ShopNotification notification);

    default UUID toUuid(String value) {
        return value == null ? null : UUID.fromString(value);
    }

    default Map<String, Object> copyMetadata(Map<String, Object> metadata) {
        return metadata == null ? Map.of() : new HashMap<>(metadata);
    }
}
```

MapStruct generates the Spring bean implementation at compile time. The default helper methods keep the conversions explicit for `String -> UUID` and defensively copy/default the `jsonb` metadata map.

## 11. Add Shop Notification Service

Create:

`notification-service/src/main/java/com/techie/microservices/notification/service/ShopNotificationService.java`

```java
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
```

## 12. Add Order Paid Shop Notification Creator

Create:

`notification-service/src/main/java/com/techie/microservices/notification/service/OrderPaidShopNotificationService.java`

```java
package com.techie.microservices.notification.service;

import com.techie.microservices.notification.dto.ShopNotificationCreateCommand;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class OrderPaidShopNotificationService {
    private final ShopNotificationService shopNotificationService;

    public void createFromOrderPaidEvent(Map<String, String> event) {
        String shopIds = event.get("shopIds");
        if (shopIds == null || shopIds.isBlank()) {
            return;
        }

        String orderId = event.get("orderId");
        String orderNumber = event.get("orderNumber");
        String customerId = event.get("customerId");
        String paidAt = event.get("paidAt");

        Arrays.stream(shopIds.split(","))
                .map(String::trim)
                .filter(shopId -> !shopId.isBlank())
                .distinct()
                .forEach(shopId -> shopNotificationService.create(new ShopNotificationCreateCommand(
                        shopId,
                        "ORDER_PAID",
                        "New paid order",
                        "Order " + orderNumber + " has been paid.",
                        "/shop/orders/" + orderId,
                        Map.of(
                                "orderId", orderId,
                                "orderNumber", orderNumber,
                                "customerId", customerId,
                                "paidAt", paidAt
                        )
                )));
    }
}
```

This class converts the generic `ORDER_PAID` integration event into shop notification rows.

## 13. Update Existing Redis Stream Listener

File:

`notification-service/src/main/java/com/techie/microservices/notification/listener/NotificationStreamListener.java`

Add dependency:

```java
private final OrderPaidShopNotificationService orderPaidShopNotificationService;
```

Update the `ORDER_PAID` branch:

```java
case "ORDER_PAID" -> {
    notificationService.sendOrderPaidEmail(body);
    orderPaidShopNotificationService.createFromOrderPaidEvent(body);
}
```

Keep `ORDER_PLACED` as email-only unless you want shop notifications for placed orders too.

## 14. Add Redis Pub/Sub Listener Config For SSE

Create:

`notification-service/src/main/java/com/techie/microservices/notification/config/ShopNotificationRedisConfig.java`

```java
package com.techie.microservices.notification.config;

import com.techie.microservices.notification.service.ShopNotificationRealtimeService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

@Configuration
@RequiredArgsConstructor
public class ShopNotificationRedisConfig {
    private final ShopNotificationRealtimeService shopNotificationRealtimeService;

    @Value("${app.notifications.shop-topic:shop-notifications}")
    private String shopNotificationTopic;

    @Bean
    RedisMessageListenerContainer shopNotificationRedisMessageListenerContainer(RedisConnectionFactory connectionFactory) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        container.addMessageListener(shopNotificationRealtimeService, new ChannelTopic(shopNotificationTopic));
        return container;
    }
}
```

## 15. Add Realtime SSE Service

Create:

`notification-service/src/main/java/com/techie/microservices/notification/service/ShopNotificationRealtimeService.java`

```java
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
```

## 16. Add Notification Controller

Create:

`notification-service/src/main/java/com/techie/microservices/notification/controller/ShopNotificationController.java`

```java
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
```

## 17. Update `order-service` Event Payload

`notification-service` needs to know which shops should receive the order paid notification. Add `shopIds` to the existing `ORDER_PAID` Redis Stream event.

### 17.1 Update `OrderPaidEvent`

File:

`order-service/src/main/java/com/techie/microservices/order/event/OrderPaidEvent.java`

Add a `List<String> shopIds` field:

```java
package com.techie.microservices.order.event;

import java.util.List;

public record OrderPaidEvent(
        String orderId,
        String orderNumber,
        String customerId,
        String paymentId,
        String paidAt,
        String email,
        String firstName,
        String lastName,
        List<String> shopIds
) {
}
```

### 17.2 Update `OrderEventPublisher`

File:

`order-service/src/main/java/com/techie/microservices/order/event/OrderEventPublisher.java`

In `publishOrderPaid`, add:

```java
if (event.shopIds() != null && !event.shopIds().isEmpty()) {
    body.put("shopIds", String.join(",", event.shopIds()));
}
```

### 17.3 Update `OrderService.confirmPaid`

File:

`order-service/src/main/java/com/techie/microservices/order/service/OrderService.java`

Before creating `OrderPaidEvent`, compute distinct shop IDs:

```java
List<String> shopIds = orderItems.stream()
        .map(OrderItem::getShopId)
        .distinct()
        .toList();
```

Then pass `shopIds` to the event:

```java
orderEventPublisher.publishOrderPaid(new OrderPaidEvent(
        order.getId(),
        order.getOrderNumber(),
        order.getCustomerId(),
        null,
        Instant.now().toString(),
        null,
        null,
        null,
        shopIds
));
```

Do not save shop notifications in `order-service`.

## 18. Update API Gateway Config

### 18.1 Add URL Config

File:

`api-gateway/src/main/resources/application.yml`

Add:

```yaml
notification:
  service:
    url: http://localhost:8083
```

### 18.2 Add Gateway Route

File:

`api-gateway/src/main/java/com/techie/microservices/gateway/routes/Routes.java`

Add field:

```java
@Value("${notification.service.url}")
private String notificationServiceUrl;
```

Add route:

```java
@Bean
public RouterFunction<ServerResponse> notificationServiceRoute() {
    return GatewayRouterFunctions.route("notification_service")
            .route(RequestPredicates.path("/api/notifications/**"), HandlerFunctions.http(notificationServiceUrl))
            .filter(CircuitBreakerFilterFunctions.circuitBreaker("notificationServiceCircuitBreaker",
                    URI.create("forward:/fallbackRoute")))
            .build();
}
```

The gateway already authenticates all non-free requests, so `/api/notifications/shop/me` and `/api/notifications/shop/me/stream` will require a valid token.

## 19. Update `shop-fe` Type

File:

`shop-fe/lib/types.ts`

Add:

```ts
export interface ShopNotificationResponseVo {
  id: UUID;
  shopId: UUID;
  type: string;
  title: string;
  content: string;
  linkUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: Instant;
  readAt?: Instant;
}
```

## 20. Update `shop-fe` API Client

File:

`shop-fe/lib/api.ts`

Import:

```ts
ShopNotificationResponseVo,
```

Add:

```ts
export async function fetchCurrentShopNotifications(): Promise<ShopNotificationResponseVo[]> {
  try {
    const response = await api.get<ShopNotificationResponseVo[]>("/notifications/shop/me");
    return response.data;
  } catch (error) {
    throw parseError(error);
  }
}
```

## 21. Add `shop-fe` Realtime Hook

Create:

`shop-fe/hooks/use-shop-notifications.ts`

```ts
"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSession, useSession } from "next-auth/react";
import { useEffect } from "react";
import { fetchCurrentShopNotifications } from "@/lib/api";
import { getAccessToken, setAccessToken } from "@/lib/auth-token";
import { ShopNotificationResponseVo } from "@/lib/types";

export const shopNotificationsQueryKey = ["shop-notifications"];

function sortNewestFirst(notifications: ShopNotificationResponseVo[]) {
  return [...notifications].sort(
    (first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
  );
}

async function resolveAccessToken() {
  const storedToken = getAccessToken();
  if (storedToken) return storedToken;

  const session = await getSession();
  if (session?.accessToken) {
    setAccessToken(session.accessToken, session.accessTokenExpires);
    return session.accessToken;
  }

  return undefined;
}

function parseSseNotifications(buffer: string) {
  const chunks = buffer.split("\n\n");
  const rest = chunks.pop() ?? "";
  const notifications = chunks.flatMap((chunk) => {
    const eventName = chunk
      .split("\n")
      .find((line) => line.startsWith("event:"))
      ?.slice("event:".length)
      .trim();

    if (eventName !== "notification") return [];

    const data = chunk
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice("data:".length).trim())
      .join("\n");

    if (!data) return [];

    try {
      return [JSON.parse(data) as ShopNotificationResponseVo];
    } catch {
      return [];
    }
  });

  return { notifications, rest };
}

export function useShopNotifications() {
  const queryClient = useQueryClient();
  const { status } = useSession();

  const query = useQuery({
    queryKey: shopNotificationsQueryKey,
    queryFn: fetchCurrentShopNotifications,
    enabled: status === "authenticated",
    staleTime: 30 * 1000,
    retry: 1,
    select: sortNewestFirst,
  });

  useEffect(() => {
    if (status !== "authenticated") return;

    const abortController = new AbortController();

    async function connect() {
      const token = await resolveAccessToken();
      if (!token || abortController.signal.aborted) return;

      const response = await fetch("/api/gateway/notifications/shop/me/stream", {
        headers: {
          Accept: "text/event-stream",
          Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
        },
        signal: abortController.signal,
      });

      if (!response.body) return;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (!abortController.signal.aborted) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parsed = parseSseNotifications(buffer);
        buffer = parsed.rest;

        for (const notification of parsed.notifications) {
          queryClient.setQueryData<ShopNotificationResponseVo[]>(shopNotificationsQueryKey, (current = []) =>
            sortNewestFirst([notification, ...current.filter((item) => item.id !== notification.id)])
          );

          if (notification.type === "ORDER_PAID") {
            await queryClient.invalidateQueries({ queryKey: ["api-workspace-orders"] });
          }
        }
      }
    }

    void connect().catch(() => undefined);

    return () => abortController.abort();
  }, [queryClient, status]);

  return query;
}
```

Native `EventSource` is not used because it cannot send an `Authorization` header. The hook uses `fetch` streaming instead.

## 22. Add Header Notification Menu

Create:

`shop-fe/components/shop-notification-menu.tsx`

```tsx
"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useShopNotifications } from "@/hooks/use-shop-notifications";

function formatNotificationTime(value: string) {
  return new Date(value).toLocaleString();
}

export function ShopNotificationMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notificationsQuery = useShopNotifications();
  const notifications = notificationsQuery.data ?? [];
  const notificationCount = notifications.length;

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="relative px-2"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Bell className="h-4 w-4" />
        {notificationCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-semibold text-white">
            {notificationCount > 99 ? "99+" : notificationCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="absolute right-0 top-11 z-30 w-[min(22rem,calc(100vw-2rem))] rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <p className="text-sm font-semibold text-slate-950">Notifications</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void notificationsQuery.refetch()}>
              Refresh
            </Button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notificationsQuery.isLoading ? (
              <p className="px-4 py-6 text-sm text-slate-500">Loading notifications...</p>
            ) : null}
            {notificationsQuery.isError ? (
              <div className="space-y-3 px-4 py-4">
                <p className="text-sm text-red-700">Unable to load notifications.</p>
                <Button type="button" variant="outline" size="sm" onClick={() => void notificationsQuery.refetch()}>
                  Retry
                </Button>
              </div>
            ) : null}
            {!notificationsQuery.isLoading && !notificationsQuery.isError && notifications.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-500">No notifications yet.</p>
            ) : null}
            {notifications.map((notification) => {
              const content = (
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-slate-950">{notification.title}</p>
                    <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      {notification.type}
                    </span>
                  </div>
                  <p className="text-sm leading-5 text-slate-600">{notification.content}</p>
                  <p className="text-xs text-slate-500">{formatNotificationTime(notification.createdAt)}</p>
                </div>
              );

              return notification.linkUrl ? (
                <Link
                  key={notification.id}
                  href={notification.linkUrl}
                  className="block border-b border-slate-100 px-4 py-3 hover:bg-slate-50"
                  onClick={() => setOpen(false)}
                >
                  {content}
                </Link>
              ) : (
                <div key={notification.id} className="border-b border-slate-100 px-4 py-3">
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
```

This makes the bell open a notification panel directly in the header. Do not add a notification table to the dashboard page.

## 23. Use Notification Menu In Header

File:

`shop-fe/components/header.tsx`

Add import:

```ts
import { ShopNotificationMenu } from "@/components/shop-notification-menu";
```

Render it near the nav/logout controls:

```tsx
{isAuthenticated ? <ShopNotificationMenu /> : null}
```

## 24. Add Notification-Service Manual Migration Helper

The repo uses manual Liquibase migrations in production. Runtime services validate schema with JPA, so the database must be migrated before the service starts with new entity mappings.

Create:

`notification-service/liquibase.properties`

```properties
changeLogFile=src/main/resources/db/changelog/db.changelog-master.xml
url=jdbc:postgresql://localhost:5433/notification_service
username=postgres
password=postgres
```

Create:

`notification-service/scripts/db.sh`

```sh
#!/usr/bin/env sh

set -eu

COMMAND="${1:-}"
VALUE="${2:-}"
LIQUIBASE_URL="${LIQUIBASE_URL:-jdbc:postgresql://localhost:5433/notification_service}"
LIQUIBASE_USERNAME="${LIQUIBASE_USERNAME:-postgres}"
LIQUIBASE_PASSWORD="${LIQUIBASE_PASSWORD:-postgres}"

mvn_liquibase() {
  mvn -pl notification-service -DskipTests \
    "-Dliquibase.url=${LIQUIBASE_URL}" \
    "-Dliquibase.username=${LIQUIBASE_USERNAME}" \
    "-Dliquibase.password=${LIQUIBASE_PASSWORD}" \
    "$@"
}

if [ -z "$COMMAND" ]; then
  echo "Usage: sh notification-service/scripts/db.sh <status|update|rollback-last|tag|rollback-tag> [value]"
  echo "Override target DB with LIQUIBASE_URL, LIQUIBASE_USERNAME, and LIQUIBASE_PASSWORD."
  exit 1
fi

case "$COMMAND" in
  status)
    mvn_liquibase liquibase:status
    ;;
  update)
    mvn_liquibase liquibase:update
    ;;
  rollback-last)
    mvn_liquibase "-Dliquibase.rollbackCount=${VALUE:-1}" liquibase:rollback
    ;;
  tag)
    if [ -z "$VALUE" ]; then
      echo "Usage: sh notification-service/scripts/db.sh tag <tag>"
      exit 1
    fi
    mvn_liquibase "-Dliquibase.tag=$VALUE" liquibase:tag
    ;;
  rollback-tag)
    if [ -z "$VALUE" ]; then
      echo "Usage: sh notification-service/scripts/db.sh rollback-tag <tag>"
      exit 1
    fi
    mvn_liquibase "-Dliquibase.rollbackTag=$VALUE" liquibase:rollback
    ;;
  *)
    echo "Usage: sh notification-service/scripts/db.sh <status|update|rollback-last|tag|rollback-tag> [value]"
    echo "Override target DB with LIQUIBASE_URL, LIQUIBASE_USERNAME, and LIQUIBASE_PASSWORD."
    exit 1
    ;;
esac
```

Make the script executable locally:

```bash
chmod +x notification-service/scripts/db.sh
```

## 25. Update Production Helm Config

These changes are needed so `notification-service` can connect to PostgreSQL and `api-gateway` can route notification APIs in the VPS Kubernetes deployment.

### 25.1 Update Postgres Initial Databases

File:

`helm/charts/infrastructure/charts/postgres/values.yaml`

Add `notification_service` to `initSql`:

```yaml
initSql: |
  CREATE DATABASE product_service;
  CREATE DATABASE order_service;
  CREATE DATABASE inventory_service;
  CREATE DATABASE payment_service;
  CREATE DATABASE shop_service;
  CREATE DATABASE customer_service;
  CREATE DATABASE wallet_service;
  CREATE DATABASE notification_service;
```

File:

`helm/charts/infrastructure/values.yaml`

Add the same database under `postgres.initSql`:

```yaml
postgres:
  initSql: |
    CREATE DATABASE product_service;
    CREATE DATABASE order_service;
    CREATE DATABASE inventory_service;
    CREATE DATABASE payment_service;
    CREATE DATABASE shop_service;
    CREATE DATABASE customer_service;
    CREATE DATABASE wallet_service;
    CREATE DATABASE notification_service;
```

File:

`helm/values.yaml`

Add the same database under `infrastructure.postgres.initSql`:

```yaml
infrastructure:
  postgres:
    initSql: |
      CREATE DATABASE product_service;
      CREATE DATABASE order_service;
      CREATE DATABASE inventory_service;
      CREATE DATABASE payment_service;
      CREATE DATABASE shop_service;
      CREATE DATABASE customer_service;
      CREATE DATABASE wallet_service;
      CREATE DATABASE notification_service;
```

Important: this init SQL runs only when the Postgres data directory is first initialized. On the existing VPS cluster with an existing PVC, create `notification_service` manually with `psql`; do not rely on `initSql`.

### 25.2 Update Applications Common Config

File:

`helm/charts/applications/templates/common-configmap.yaml`

Add:

```yaml
  NOTIFICATION_SERVICE_URL: {{ .Values.commonConfig.notificationServiceUrl | quote }}
```

File:

`helm/charts/applications/values.yaml`

Add:

```yaml
commonConfig:
  notificationServiceUrl: http://notification-service.microservices.svc.cluster.local:8083
```

### 25.3 Update Notification-Service Helm Values

File:

`helm/charts/applications/charts/notification-service/values.yaml`

Add datasource, shop service URL, and notification topic:

```yaml
config:
  datasourceUrl: jdbc:postgresql://postgres.microservices.svc.cluster.local:5432/notification_service
  datasourceUsername: postgres
  datasourcePassword: postgres
  schemaRegistryUrl: http://schema-registry.microservices.svc.cluster.local:8081
  mailHost: mailhog.microservices.svc.cluster.local
  mailPort: "1025"
  shopServiceUrl: http://shop-service.microservices.svc.cluster.local:8086
  shopNotificationTopic: shop-notifications
```

Also update the parent values file:

`helm/charts/applications/values.yaml`

Under `notificationService.config`, add:

```yaml
notificationService:
  config:
    datasourceUrl: jdbc:postgresql://postgres.microservices.svc.cluster.local:5432/notification_service
    datasourceUsername: postgres
    datasourcePassword: postgres
    shopServiceUrl: http://shop-service.microservices.svc.cluster.local:8086
    shopNotificationTopic: shop-notifications
```

### 25.4 Update Notification-Service ConfigMap

File:

`helm/charts/applications/charts/notification-service/templates/configmap.yaml`

Add:

```yaml
  SPRING_DATASOURCE_URL: {{ .Values.config.datasourceUrl | quote }}
  SPRING_DATASOURCE_USERNAME: {{ .Values.config.datasourceUsername | quote }}
  SPRING_DATASOURCE_PASSWORD: {{ .Values.config.datasourcePassword | quote }}
  SHOP_SERVICE_URL: {{ .Values.config.shopServiceUrl | quote }}
  APP_NOTIFICATIONS_SHOP_TOPIC: {{ .Values.config.shopNotificationTopic | quote }}
```

Keep the existing keys:

```yaml
  SPRING_KAFKA_CONSUMER_PROPERTIES_SCHEMA_REGISTRY_URL: {{ .Values.config.schemaRegistryUrl | quote }}
  SPRING_MAIL_HOST: {{ .Values.config.mailHost | quote }}
  SPRING_MAIL_PORT: {{ .Values.config.mailPort | quote }}
```

### 25.5 Update Notification-Service Deployment

File:

`helm/charts/applications/charts/notification-service/templates/deployment.yaml`

Add these env vars to the container:

```yaml
            - name: SPRING_DATASOURCE_URL
              valueFrom:
                configMapKeyRef:
                  name: notification-service-config
                  key: SPRING_DATASOURCE_URL
            - name: SPRING_DATASOURCE_USERNAME
              valueFrom:
                configMapKeyRef:
                  name: notification-service-config
                  key: SPRING_DATASOURCE_USERNAME
            - name: SPRING_DATASOURCE_PASSWORD
              valueFrom:
                configMapKeyRef:
                  name: notification-service-config
                  key: SPRING_DATASOURCE_PASSWORD
            - name: SHOP_SERVICE_URL
              valueFrom:
                configMapKeyRef:
                  name: notification-service-config
                  key: SHOP_SERVICE_URL
            - name: APP_NOTIFICATIONS_SHOP_TOPIC
              valueFrom:
                configMapKeyRef:
                  name: notification-service-config
                  key: APP_NOTIFICATIONS_SHOP_TOPIC
```

### 25.6 Update API Gateway Application Config

File:

`api-gateway/src/main/resources/application.yml`

Add:

```yaml
notification:
  service:
    url: http://localhost:8083
```

### 25.7 Update API Gateway Helm Env

File:

`helm/charts/applications/charts/api-gateway/templates/api-gateway-deployment.yaml`

Add:

```yaml
            - name: NOTIFICATION_SERVICE_URL
              valueFrom:
                configMapKeyRef:
                  name: common-config
                  key: NOTIFICATION_SERVICE_URL
```

### 25.8 Update API Gateway Route

File:

`api-gateway/src/main/java/com/techie/microservices/gateway/routes/Routes.java`

Add field:

```java
@Value("${notification.service.url}")
private String notificationServiceUrl;
```

Add route:

```java
@Bean
public RouterFunction<ServerResponse> notificationServiceRoute() {
    return GatewayRouterFunctions.route("notification_service")
            .route(RequestPredicates.path("/api/notifications/**"), HandlerFunctions.http(notificationServiceUrl))
            .filter(CircuitBreakerFilterFunctions.circuitBreaker("notificationServiceCircuitBreaker",
                    URI.create("forward:/fallbackRoute")))
            .build();
}
```

## 26. Update Production Manual Migration Docs

File:

`helm/README.manual-migration.md`

Add `notification_service` to the service database list:

```text
- notification_service
```

Add the notification migration command:

```bash
LIQUIBASE_USERNAME=postgres LIQUIBASE_PASSWORD=postgres \
LIQUIBASE_URL=jdbc:postgresql://postgres.microservices.svc.cluster.local:5432/notification_service \
sh notification-service/scripts/db.sh update
```

Add `notification_service` to reset loops only if you intentionally reset all service databases:

```bash
for db in product_service payment_service shop_service customer_service order_service inventory_service wallet_service notification_service; do
  kubectl exec -n microservices "$POSTGRES_POD" -- psql -U postgres -d postgres -c \
    "DROP DATABASE IF EXISTS ${db} WITH (FORCE);"
  kubectl exec -n microservices "$POSTGRES_POD" -- psql -U postgres -d postgres -c \
    "CREATE DATABASE ${db};"
done
```

Add `notification-service` to scale commands when doing a full reset:

```bash
kubectl scale deployment -n microservices \
  product-service payment-service shop-service customer-service order-service inventory-service wallet-service notification-service \
  --replicas=0
```

## 27. VPS Production Rollout Sequence

Use this sequence for the first production deployment because `notification-service` will validate JPA schema at startup.

1. SSH into VPS:

```bash
ssh root@103.6.234.153
cd /root/spring-boot
git fetch origin master
git checkout --detach origin/master
```

2. Create database if it does not exist. This is required on existing clusters because Postgres init SQL will not rerun for an existing PVC:

```bash
POSTGRES_POD=$(kubectl get pod -n microservices -l app=postgres -o jsonpath='{.items[0].metadata.name}')

kubectl exec -n microservices "$POSTGRES_POD" -- psql -U postgres -d postgres -tc \
  "SELECT 1 FROM pg_database WHERE datname = 'notification_service';" | grep -q 1 || \
kubectl exec -n microservices "$POSTGRES_POD" -- psql -U postgres -d postgres -c \
  "CREATE DATABASE notification_service;"
```

3. Check pending Liquibase changes:

```bash
LIQUIBASE_USERNAME=postgres LIQUIBASE_PASSWORD=postgres \
LIQUIBASE_URL=jdbc:postgresql://postgres.microservices.svc.cluster.local:5432/notification_service \
sh notification-service/scripts/db.sh status
```

4. Run migration:

```bash
LIQUIBASE_USERNAME=postgres LIQUIBASE_PASSWORD=postgres \
LIQUIBASE_URL=jdbc:postgresql://postgres.microservices.svc.cluster.local:5432/notification_service \
sh notification-service/scripts/db.sh update
```

5. Deploy code through the existing workflow.

For a manual GitHub Actions run, include all affected deployables:

```text
backend_modules:
api-gateway order-service notification-service

frontend_apps:
shop-fe
```

Reason:

- `order-service`: publishes `shopIds` in `ORDER_PAID`
- `notification-service`: owns DB, APIs, Redis Pub/Sub, SSE
- `api-gateway`: routes `/api/notifications/**`
- `shop-fe`: fetches and streams shop notifications

The workflow `.github/workflows/deploy-vps.yml` already knows these module names and maps them to Helm value keys:

```text
api-gateway -> apiGateway
order-service -> orderService
notification-service -> notificationService
shop-fe -> shopFe
```

6. If deploying from the VPS manually after chart/code changes, run:

```bash
helm dependency build helm/charts/applications
helm dependency build helm/charts/infrastructure
helm dependency build helm

helm upgrade --install microservices helm \
  --namespace microservices \
  --create-namespace
```

7. Restart affected deployments if needed:

```bash
kubectl rollout restart deployment/api-gateway -n microservices
kubectl rollout restart deployment/order-service -n microservices
kubectl rollout restart deployment/notification-service -n microservices
kubectl rollout restart deployment/shop-fe -n microservices

kubectl rollout status deployment/api-gateway -n microservices --timeout=300s
kubectl rollout status deployment/order-service -n microservices --timeout=300s
kubectl rollout status deployment/notification-service -n microservices --timeout=300s
kubectl rollout status deployment/shop-fe -n microservices --timeout=300s
```

8. Check logs:

```bash
kubectl logs -n microservices deploy/notification-service --tail=160
kubectl logs -n microservices deploy/api-gateway --tail=120
kubectl logs -n microservices deploy/order-service --tail=120
```

## 28. Manual Verification

1. Create database:

```sql
create database notification_service;
```

2. Start Redis.

3. Start services:

- `shop-service`
- `order-service`
- `notification-service`
- `api-gateway`
- `shop-fe`

4. Confirm an order as paid:

```http
POST /api/order/{orderId}/confirm-paid
```

5. Verify `notification-service` database:

```sql
select id, shop_id, type, title, content, link_url, metadata, created_at
from t_shop_notification
order by created_at desc;
```

6. Verify list endpoint through gateway:

```http
GET /api/notifications/shop/me
Authorization: Bearer <shop-token>
```

7. Verify realtime:

- Open the shop dashboard.
- Confirm another order as paid.
- The notification should appear without reload.

8. Verify reload behavior:

- Reload the shop dashboard.
- Notifications still appear because they are stored in PostgreSQL.

## 29. Future Shop Notification Examples

Future services should publish events that `notification-service` consumes and converts into `ShopNotificationCreateCommand`.

Low stock example:

```java
shopNotificationService.create(new ShopNotificationCreateCommand(
        shopId,
        "STOCK_LOW",
        "Low stock",
        "SKU " + skuCode + " is running low.",
        "/shop/products/" + productId,
        Map.of(
                "skuId", skuId,
                "skuCode", skuCode,
                "remainingQuantity", remainingQuantity
        )
));
```

Product rejection example:

```java
shopNotificationService.create(new ShopNotificationCreateCommand(
        shopId,
        "PRODUCT_REJECTED",
        "Product rejected",
        "Your product was rejected. Please update the required information.",
        "/shop/products/" + productId,
        Map.of(
                "productId", productId,
                "reason", reason
        )
));
```

No table change is needed for these future flows because `metadata` is `jsonb`.

## 30. Additional Local Docker Compose Config

Apply these changes to both compose files:

- `docker-compose.yml`
- `docker-compose.local.yml`

The same database rule applies here: `docker/postgres/init.sql` only runs when the `postgres-data` volume is first created. If the volume already exists, create `notification_service` manually.

### 30.1 Update `docker/postgres/init.sql`

Add:

```sql
CREATE DATABASE notification_service;
```

Final file should include:

```sql
CREATE DATABASE product_service;
CREATE DATABASE order_service;
CREATE DATABASE inventory_service;
CREATE DATABASE payment_service;
CREATE DATABASE shop_service;
CREATE DATABASE customer_service;
CREATE DATABASE wallet_service;
CREATE DATABASE notification_service;
```

### 30.2 Existing Compose Volume Case

If `postgres-data` already exists, run this after Postgres is up:

```bash
docker compose exec postgres psql -U postgres -d postgres -tc \
  "SELECT 1 FROM pg_database WHERE datname = 'notification_service';" | grep -q 1 || \
docker compose exec postgres psql -U postgres -d postgres -c \
  "CREATE DATABASE notification_service;"
```

For `docker-compose.local.yml`, use:

```bash
docker compose -f docker-compose.local.yml exec postgres psql -U postgres -d postgres -tc \
  "SELECT 1 FROM pg_database WHERE datname = 'notification_service';" | grep -q 1 || \
docker compose -f docker-compose.local.yml exec postgres psql -U postgres -d postgres -c \
  "CREATE DATABASE notification_service;"
```

### 30.3 Update `notification-service` In `docker-compose.yml`

Add `postgres`, `redis`, and `shop-service` dependencies:

```yaml
  notification-service:
    depends_on:
      postgres:
        condition: service_healthy
      broker:
        condition: service_started
      schema-registry:
        condition: service_started
      mailhog:
        condition: service_started
      redis:
        condition: service_healthy
      shop-service:
        condition: service_started
```

Add these env vars:

```yaml
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/notification_service
      SPRING_DATASOURCE_USERNAME: postgres
      SPRING_DATASOURCE_PASSWORD: postgres
      SPRING_DATA_REDIS_HOST: redis
      SPRING_DATA_REDIS_PORT: 6379
      SHOP_SERVICE_URL: http://shop-service:8086
      APP_NOTIFICATIONS_SHOP_TOPIC: shop-notifications
```

Keep existing env vars:

```yaml
      SPRING_MAIL_HOST: mailhog
      SPRING_MAIL_PORT: 1025
      SPRING_KAFKA_BOOTSTRAP_SERVERS: broker:29092
      SPRING_KAFKA_CONSUMER_PROPERTIES_SCHEMA_REGISTRY_URL: http://schema-registry:8081
      LOKI_URL: http://loki:3100/loki/api/v1/push
      MANAGEMENT_ZIPKIN_TRACING_ENDPOINT: http://tempo:9411
```

### 30.4 Update `notification-service` In `docker-compose.local.yml`

Use the same dependency and env changes as `docker-compose.yml`, but keep the local build and volume config:

```yaml
  notification-service:
    build:
      context: .
      dockerfile: notification-service/Dockerfile.local
    depends_on:
      postgres:
        condition: service_healthy
      broker:
        condition: service_started
      schema-registry:
        condition: service_started
      mailhog:
        condition: service_started
      redis:
        condition: service_healthy
      shop-service:
        condition: service_started
    ports:
      - "8083:8083"
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/notification_service
      SPRING_DATASOURCE_USERNAME: postgres
      SPRING_DATASOURCE_PASSWORD: postgres
      SPRING_DATA_REDIS_HOST: redis
      SPRING_DATA_REDIS_PORT: 6379
      SHOP_SERVICE_URL: http://shop-service:8086
      APP_NOTIFICATIONS_SHOP_TOPIC: shop-notifications
      SPRING_MAIL_HOST: mailhog
      SPRING_MAIL_PORT: 1025
      SPRING_KAFKA_BOOTSTRAP_SERVERS: broker:29092
      SPRING_KAFKA_CONSUMER_PROPERTIES_SCHEMA_REGISTRY_URL: http://schema-registry:8081
      LOKI_URL: http://loki:3100/loki/api/v1/push
      MANAGEMENT_ZIPKIN_TRACING_ENDPOINT: http://tempo:9411
    volumes:
      - ./:/workspace
      - backend-maven-cache:/root/.m2
```

### 30.5 Update `api-gateway` In Both Compose Files

Add `notification-service` dependency:

```yaml
    depends_on:
      notification-service:
        condition: service_started
```

Add env var:

```yaml
      NOTIFICATION_SERVICE_URL: http://notification-service:8083
```

Keep the existing service URL env vars:

```yaml
      PRODUCT_SERVICE_URL: http://product-service:8080
      ORDER_SERVICE_URL: http://order-service:8081
      INVENTORY_SERVICE_URL: http://inventory-service:8082
      PAYMENT_SERVICE_URL: http://payment-service:8085
      SHOP_SERVICE_URL: http://shop-service:8086
      CUSTOMER_SERVICE_URL: http://customer-service:8087
```

If the compose file includes `WALLET_SERVICE_URL`, keep it.

### 30.6 Local Compose Migration

Run migration before starting or after creating the DB but before relying on the service:

```bash
LIQUIBASE_USERNAME=postgres LIQUIBASE_PASSWORD=postgres \
LIQUIBASE_URL=jdbc:postgresql://localhost:5433/notification_service \
sh notification-service/scripts/db.sh update
```

Then start or restart the affected services:

```bash
docker compose up -d notification-service api-gateway shop-fe
```

For local dev compose:

```bash
docker compose -f docker-compose.local.yml up -d notification-service api-gateway shop-fe
```

## 31. Additional Raw Kubernetes `/k8s` Config

These instructions are for the raw manifests under `/k8s/manifests`. Helm config is covered earlier.

### 31.1 Update `k8s/manifests/infrastructure/postgres/postgres-configmap.yaml`

Add `notification_service` to the init SQL:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: postgres-initdb-config
data:
  init.sql: |
    CREATE DATABASE product_service;
    CREATE DATABASE order_service;
    CREATE DATABASE inventory_service;
    CREATE DATABASE payment_service;
    CREATE DATABASE shop_service;
    CREATE DATABASE customer_service;
    CREATE DATABASE wallet_service;
    CREATE DATABASE notification_service;
```

Again, this only affects fresh Postgres volumes. For an existing PV, create the database manually.

### 31.2 Existing Raw K8s PV Case

Run:

```bash
POSTGRES_POD=$(kubectl get pod -n microservices -l app=postgres -o jsonpath='{.items[0].metadata.name}')

kubectl exec -n microservices "$POSTGRES_POD" -- psql -U postgres -d postgres -tc \
  "SELECT 1 FROM pg_database WHERE datname = 'notification_service';" | grep -q 1 || \
kubectl exec -n microservices "$POSTGRES_POD" -- psql -U postgres -d postgres -c \
  "CREATE DATABASE notification_service;"
```

### 31.3 Update `k8s/manifests/applications/common-config.yaml`

Add:

```yaml
  NOTIFICATION_SERVICE_URL: "http://notification-service.microservices.svc.cluster.local:8083"
```

Full relevant service URL block:

```yaml
data:
  PRODUCT_SERVICE_URL: "http://product-service.microservices.svc.cluster.local:8080"
  ORDER_SERVICE_URL: "http://order-service.microservices.svc.cluster.local:8081"
  INVENTORY_SERVICE_URL: "http://inventory-service.microservices.svc.cluster.local:8082"
  PAYMENT_SERVICE_URL: "http://payment-service.microservices.svc.cluster.local:8085"
  SHOP_SERVICE_URL: "http://shop-service.microservices.svc.cluster.local:8086"
  CUSTOMER_SERVICE_URL: "http://customer-service.microservices.svc.cluster.local:8087"
  WALLET_SERVICE_URL: "http://wallet-service.microservices.svc.cluster.local:8088"
  NOTIFICATION_SERVICE_URL: "http://notification-service.microservices.svc.cluster.local:8083"
```

### 31.4 Update `k8s/manifests/applications/notification-service/notification-service-configmap.yaml`

Add:

```yaml
data:
  SPRING_DATASOURCE_URL: "jdbc:postgresql://postgres.microservices.svc.cluster.local:5432/notification_service"
  SPRING_DATASOURCE_USERNAME: "postgres"
  SPRING_DATASOURCE_PASSWORD: "postgres"
  SHOP_SERVICE_URL: "http://shop-service.microservices.svc.cluster.local:8086"
  APP_NOTIFICATIONS_SHOP_TOPIC: "shop-notifications"
```

Keep:

```yaml
  SPRING_KAFKA_CONSUMER_PROPERTIES_SCHEMA_REGISTRY_URL: "http://schema-registry.microservices.svc.cluster.local:8081"
  SPRING_MAIL_HOST: "mailhog.microservices.svc.cluster.local"
  SPRING_MAIL_PORT: "1025"
```

### 31.5 Update `k8s/manifests/applications/notification-service/notification-service-deployment.yaml`

Add env vars:

```yaml
            - name: SPRING_DATASOURCE_URL
              valueFrom:
                configMapKeyRef:
                  key: SPRING_DATASOURCE_URL
                  name: notification-service-config
            - name: SPRING_DATASOURCE_USERNAME
              valueFrom:
                configMapKeyRef:
                  key: SPRING_DATASOURCE_USERNAME
                  name: notification-service-config
            - name: SPRING_DATASOURCE_PASSWORD
              valueFrom:
                configMapKeyRef:
                  key: SPRING_DATASOURCE_PASSWORD
                  name: notification-service-config
            - name: SHOP_SERVICE_URL
              valueFrom:
                configMapKeyRef:
                  key: SHOP_SERVICE_URL
                  name: notification-service-config
            - name: APP_NOTIFICATIONS_SHOP_TOPIC
              valueFrom:
                configMapKeyRef:
                  key: APP_NOTIFICATIONS_SHOP_TOPIC
                  name: notification-service-config
```

The deployment already has Redis env vars from `common-config`; keep them:

```yaml
            - name: SPRING_DATA_REDIS_HOST
              valueFrom:
                configMapKeyRef:
                  key: SPRING_DATA_REDIS_HOST
                  name: common-config
            - name: SPRING_DATA_REDIS_PORT
              valueFrom:
                configMapKeyRef:
                  key: SPRING_DATA_REDIS_PORT
                  name: common-config
```

### 31.6 Update `k8s/manifests/applications/api-gateway/api-gateway-deployment.yaml`

Add:

```yaml
            - name: NOTIFICATION_SERVICE_URL
              valueFrom:
                configMapKeyRef:
                  key: NOTIFICATION_SERVICE_URL
                  name: common-config
```

### 31.7 Apply Raw K8s Manifests

Apply configmaps first:

```bash
kubectl apply -n microservices -f k8s/manifests/infrastructure/postgres/postgres-configmap.yaml
kubectl apply -n microservices -f k8s/manifests/applications/common-config.yaml
kubectl apply -n microservices -f k8s/manifests/applications/notification-service/notification-service-configmap.yaml
```

Run the database creation step if the PV already exists, then run Liquibase:

```bash
LIQUIBASE_USERNAME=postgres LIQUIBASE_PASSWORD=postgres \
LIQUIBASE_URL=jdbc:postgresql://postgres.microservices.svc.cluster.local:5432/notification_service \
sh notification-service/scripts/db.sh update
```

Apply deployments:

```bash
kubectl apply -n microservices -f k8s/manifests/applications/notification-service/notification-service-deployment.yaml
kubectl apply -n microservices -f k8s/manifests/applications/api-gateway/api-gateway-deployment.yaml
```

Restart if the pods were already running:

```bash
kubectl rollout restart deployment/notification-service -n microservices
kubectl rollout restart deployment/api-gateway -n microservices

kubectl rollout status deployment/notification-service -n microservices --timeout=300s
kubectl rollout status deployment/api-gateway -n microservices --timeout=300s
```
