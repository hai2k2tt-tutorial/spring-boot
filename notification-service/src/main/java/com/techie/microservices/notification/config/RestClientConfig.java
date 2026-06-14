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