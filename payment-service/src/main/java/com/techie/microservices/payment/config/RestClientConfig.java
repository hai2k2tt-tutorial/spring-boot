package com.techie.microservices.payment.config;

import com.techie.microservices.payment.client.OrderClient;
import com.techie.microservices.payment.client.WalletClient;
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
    @Value("${order.service.url}")
    private String orderServiceUrl;
    @Value("${wallet.service.url}")
    private String walletServiceUrl;
    private final ObservationRegistry observationRegistry;

    @Bean
    public OrderClient orderClient() {
        return createClient(orderServiceUrl, OrderClient.class);
    }

    @Bean
    public WalletClient walletClient() {
        return createClient(walletServiceUrl, WalletClient.class);
    }

    private <T> T createClient(String baseUrl, Class<T> clientType) {
        RestClient restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(getClientRequestFactory())
                .observationRegistry(observationRegistry)
                .build();
        RestClientAdapter restClientAdapter = RestClientAdapter.create(restClient);
        HttpServiceProxyFactory httpServiceProxyFactory = HttpServiceProxyFactory.builderFor(restClientAdapter).build();
        return httpServiceProxyFactory.createClient(clientType);
    }

    private ClientHttpRequestFactory getClientRequestFactory() {
        ClientHttpRequestFactorySettings clientHttpRequestFactorySettings = ClientHttpRequestFactorySettings.defaults()
                .withConnectTimeout(Duration.ofSeconds(3))
                .withReadTimeout(Duration.ofSeconds(3));
        return ClientHttpRequestFactoryBuilder.simple().build(clientHttpRequestFactorySettings);
    }
}
