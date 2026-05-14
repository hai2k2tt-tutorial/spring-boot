# Microservices Helm Install on VPS

This guide is for an Ubuntu 24 VPS with Kubernetes already installed.

Your current control plane IP is `103.6.234.153` and the public domain is `haint.fyi`.

The chart defaults in `/helm` are now aligned to this VPS deployment:

- public domain: `haint.fyi`
- control plane IP: `103.6.234.153`
- public gateway entrypoint: `http://*.haint.fyi:31437`
- internal service-to-service traffic stays on cluster DNS under `microservices.svc.cluster.local`

## What this chart installs

- `microservices` namespace
- Infrastructure: MySQL, MongoDB, Kafka, Keycloak, Mailpit, Grafana, Prometheus, Loki, Tempo
- Applications: API gateway, product service, order service, inventory service, notification service, frontend, frontend-next
- Gateway API resources: `Gateway` and `HTTPRoute`

## Before you install

1. Point your DNS records to the VPS public IP.

   Typical setup is one wildcard and one base record:

   ```text
   haint.fyi -> 103.6.234.153
   *.haint.fyi -> 103.6.234.153
   ```

   If you do not use wildcard DNS, create individual A records for each hostname used by the gateway routes.

2. Open the gateway port in the VPS firewall.

   The bundled Gateway resource currently exposes HTTP only, so the public entrypoint is the NodePort mapped to port `31437`.

   ```text
   TCP 31437
   ```

   Keep `30478` closed unless you add TLS to the chart or put a reverse proxy in front of the cluster.

3. Update the local-only hostnames in the chart values.

   Replace the default `*.local` hostnames with your own domain names in `helm/charts/k8s-gateway/values.yaml`.

   Recommended hostnames for this setup:

   - `frontend.haint.fyi`
   - `frontend-next.haint.fyi`
   - `api.haint.fyi`
   - `keycloak.haint.fyi`
   - `kafka-ui.haint.fyi`
   - `grafana.haint.fyi`
   - `tempo.haint.fyi`
   - `prometheus.haint.fyi`
   - `mailhog.haint.fyi`
   - `schema-registry.haint.fyi`
   - `loki.haint.fyi`

4. Update application URLs.

   At minimum, adjust these values in `helm/charts/applications/values.yaml`:

   - `apiGateway.config.issuerUri`
   - `frontendNext.config.nextPublicApiBaseUrl`
   - `frontendNext.config.authUrl`
   - `frontendNext.config.authIssuer`

   Keep the internal cluster DNS entries if they still match your service names.

   For `haint.fyi`, the public values should look like this:

   ```yaml
   apiGateway:
     config:
       issuerUri: http://keycloak.haint.fyi:31437/realms/spring-microservices-security-realm

   frontendNext:
     config:
       nextPublicApiBaseUrl: http://api.haint.fyi:31437/api
       authUrl: http://frontend-next.haint.fyi:31437
       authIssuer: http://keycloak.haint.fyi:31437/realms/spring-microservices-security-realm
   ```

5. Review Keycloak redirect URIs.

   The chart defaults now include:

   ```text
   http://frontend-next.haint.fyi:31437
   http://frontend-next.haint.fyi:31437/*
   http://frontend-next.haint.fyi:31437/api/auth/callback/keycloak
   ```

6. Review Prometheus scrape targets if you need metrics.

   The chart now scrapes the in-cluster service DNS names for:

   - `api-gateway.microservices.svc.cluster.local:9000`
   - `product-service.microservices.svc.cluster.local:8080`
   - `order-service.microservices.svc.cluster.local:8081`
   - `inventory-service.microservices.svc.cluster.local:8082`
   - `notification-service.microservices.svc.cluster.local:8083`

## Install prerequisites

Make sure these are available on the VPS or on the machine you use to administer the cluster:

- `kubectl`
- `helm`
- access to the Kubernetes context for the VPS cluster

## Install order

Install the Gateway API CRDs first:

```bash
kubectl kustomize "https://github.com/nginx/nginx-gateway-fabric/config/crd/gateway-api/standard?ref=v2.6.0" | kubectl apply -f -
kubectl apply --server-side -f "https://raw.githubusercontent.com/nginx/nginx-gateway-fabric/v2.6.0/deploy/crds.yaml"
```

Install the NGINX Gateway Fabric controller as a separate release:

```bash
helm install ngf oci://ghcr.io/nginx/charts/nginx-gateway-fabric \
  --namespace nginx-gateway \
  --create-namespace \
  -f helm/gateway-controller/values.yaml
```

Wait for the controller to become ready:

```bash
kubectl wait --timeout=5m -n nginx-gateway deployment/ngf-nginx-gateway-fabric --for=condition=Available
```

Build the umbrella chart dependencies:

```bash
helm dependency build helm
```

Install or upgrade the application stack:

```bash
helm upgrade --install microservices helm \
  --namespace microservices \
  --create-namespace
```

## Verify

```bash
kubectl get pods -n nginx-gateway
kubectl get pods -n microservices
kubectl get gateway,httproute -n microservices
kubectl get gatewayclass
```

If you installed metrics-server, you can also check:

```bash
kubectl top nodes
kubectl top pods -n microservices
```

## Access the services

Use the domain names you configured in the gateway routes.

Service map for `haint.fyi`, assuming you kept the same route names:

| Service | Hostname | Backend port | Public URL |
| --- | --- | --- | --- |
| frontend | `frontend.haint.fyi` | `80` | `http://frontend.haint.fyi:31437/` |
| frontend-next | `frontend-next.haint.fyi` | `3001` | `http://frontend-next.haint.fyi:31437/` |
| api-gateway | `api.haint.fyi` | `9000` | `http://api.haint.fyi:31437/` |
| keycloak | `keycloak.haint.fyi` | `8080` | `http://keycloak.haint.fyi:31437/` |
| kafka-ui | `kafka-ui.haint.fyi` | `8080` | `http://kafka-ui.haint.fyi:31437/` |
| grafana | `grafana.haint.fyi` | `3000` | `http://grafana.haint.fyi:31437/` |
| tempo | `tempo.haint.fyi` | `3100` | `http://tempo.haint.fyi:31437/` |
| prometheus | `prometheus.haint.fyi` | `9090` | `http://prometheus.haint.fyi:31437/` |
| mailhog | `mailhog.haint.fyi` | `8025` | `http://mailhog.haint.fyi:31437/` |
| schema-registry | `schema-registry.haint.fyi` | `8081` | `http://schema-registry.haint.fyi:31437/` |
| loki | `loki.haint.fyi` | `3100` | `http://loki.haint.fyi:31437/` |

## Value checklist

If you want a single checklist for the VPS install, update these files:

- `helm/charts/k8s-gateway/values.yaml`
- `helm/charts/applications/values.yaml`
- `helm/charts/infrastructure/charts/keycloak/templates/configmap.yaml`
- `helm/charts/infrastructure/charts/observability/charts/prometheus/templates/prometheus-configmap.yaml`

## Notes

- The chart currently defines an HTTP Gateway listener only.
- If you want clean `https://` URLs on ports `443`, add TLS termination in front of the cluster or extend the Gateway resources accordingly.
- The local `kind` install guide in `README.md` still applies to Docker-based development, but it is not the right path for this VPS deployment.
