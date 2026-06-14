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
