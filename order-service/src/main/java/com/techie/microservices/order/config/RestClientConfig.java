package com.techie.microservices.order.config;

import com.techie.microservices.order.client.InventoryClient;
import com.techie.microservices.order.client.PaymentClient;
import com.techie.microservices.order.client.ProductClient;
import com.techie.microservices.order.client.ShopClient;
import io.micrometer.observation.ObservationRegistry;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.http.client.ClientHttpRequestFactoryBuilder;
import org.springframework.boot.http.client.ClientHttpRequestFactorySettings;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.support.RestClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;

import java.time.Duration;

@Configuration
@RequiredArgsConstructor
public class RestClientConfig {
    private static final Duration DEFAULT_CONNECT_TIMEOUT = Duration.ofSeconds(3);
    private static final Duration DEFAULT_READ_TIMEOUT = Duration.ofSeconds(3);
    private static final Duration PAYMENT_READ_TIMEOUT = Duration.ofSeconds(15);

    @Value("${inventory.service.url}")
    private String inventoryServiceUrl;

    @Value("${product.service.url}")
    private String productServiceUrl;

    @Value("${payment.service.url}")
    private String paymentServiceUrl;

    @Value("${shop.service.url}")
    private String shopServiceUrl;

    private final ObservationRegistry observationRegistry;

    @Bean
    public InventoryClient inventoryClient() {
        return createClient(InventoryClient.class, inventoryServiceUrl);
    }

    @Bean
    public ProductClient productClient() {
        return createClient(ProductClient.class, productServiceUrl);
    }

    @Bean
    public PaymentClient paymentClient() {
        return createClient(PaymentClient.class, paymentServiceUrl, PAYMENT_READ_TIMEOUT);
    }

    @Bean
    public ShopClient shopClient() {
        return createClient(ShopClient.class, shopServiceUrl);
    }

    private <T> T createClient(Class<T> clientType, String baseUrl) {
        return createClient(clientType, baseUrl, DEFAULT_READ_TIMEOUT);
    }

    private <T> T createClient(Class<T> clientType, String baseUrl, Duration readTimeout) {
        RestClient restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(getClientRequestFactory(readTimeout))
                .observationRegistry(observationRegistry)
                .build();
        RestClientAdapter restClientAdapter = RestClientAdapter.create(restClient);
        HttpServiceProxyFactory httpServiceProxyFactory = HttpServiceProxyFactory.builderFor(restClientAdapter).build();
        return httpServiceProxyFactory.createClient(clientType);
    }

    private ClientHttpRequestFactory getClientRequestFactory(Duration readTimeout) {
        ClientHttpRequestFactorySettings clientHttpRequestFactorySettings = ClientHttpRequestFactorySettings.defaults()
                .withConnectTimeout(DEFAULT_CONNECT_TIMEOUT)
                .withReadTimeout(readTimeout);
        return ClientHttpRequestFactoryBuilder.simple().build(clientHttpRequestFactorySettings);
    }
}
