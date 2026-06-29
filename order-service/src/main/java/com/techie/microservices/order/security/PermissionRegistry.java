package com.techie.microservices.order.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;
import org.yaml.snakeyaml.Yaml;

import java.io.InputStream;
import java.util.List;
import java.util.Map;

@Component
public class PermissionRegistry {
    private final Map<String, PermissionRule> permissions;

    public PermissionRegistry(ResourceLoader resourceLoader,
                              @Value("${app.permissions.file:classpath:permissions.yml}") String permissionFile) {
        this.permissions = loadPermissions(resourceLoader.getResource(permissionFile));
    }

    public PermissionRule require(String permission) {
        PermissionRule rule = permissions.get(permission);
        if (rule == null) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Unknown permission: " + permission);
        }
        return rule;
    }

    public PermissionRule require(Permission permission) {
        return require(permission.key());
    }

    @SuppressWarnings("unchecked")
    private Map<String, PermissionRule> loadPermissions(Resource resource) {
        try (InputStream inputStream = resource.getInputStream()) {
            Object loaded = new Yaml().load(inputStream);
            if (!(loaded instanceof Map<?, ?> root)) {
                return Map.of();
            }
            Object permissionsNode = root.get("permissions");
            if (!(permissionsNode instanceof Map<?, ?> permissionMap)) {
                return Map.of();
            }
            return permissionMap.entrySet().stream()
                    .filter(entry -> entry.getKey() instanceof String && entry.getValue() instanceof Map<?, ?>)
                    .collect(java.util.stream.Collectors.toUnmodifiableMap(
                            entry -> (String) entry.getKey(),
                            entry -> toRule((Map<String, Object>) entry.getValue())
                    ));
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to load permission file " + resource, exception);
        }
    }

    private PermissionRule toRule(Map<String, Object> ruleNode) {
        Object authoritiesNode = ruleNode.get("authorities");
        if (!(authoritiesNode instanceof List<?> authorities)) {
            return new PermissionRule(List.of());
        }
        return new PermissionRule(authorities.stream()
                .filter(String.class::isInstance)
                .map(String.class::cast)
                .toList());
    }

    public record PermissionRule(List<String> authorities) {
    }
}
