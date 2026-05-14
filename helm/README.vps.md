# Microservices Helm Install on VPS

This guide is for an Ubuntu 24 VPS with Kubernetes already installed.

Your current control plane IP is `103.6.234.153` and the public domain is `haint.fyi`.

The chart defaults in `/helm` are now aligned to this VPS deployment:

- public domain: `haint.fyi`
- control plane IP: `103.6.234.153`
- public gateway entrypoint: `https://*.haint.fyi`
- Kubernetes node architecture: `linux/amd64`
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

2. Open the gateway ports in the VPS firewall or security group.

   The bundled Gateway resource exposes HTTP on port `80` and HTTPS on port `443` through the NGINX Gateway Fabric data plane running with host ports.

   ```text
   TCP 80
   TCP 443
   ```

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
       issuerUri: https://keycloak.haint.fyi/realms/spring-microservices-security-realm

   frontendNext:
     config:
       nextPublicApiBaseUrl: https://api.haint.fyi/api
       authUrl: https://frontend-next.haint.fyi
       authIssuer: https://keycloak.haint.fyi/realms/spring-microservices-security-realm
   ```

5. Review Keycloak redirect URIs.

   The chart defaults now include:

   ```text
   https://frontend-next.haint.fyi
   https://frontend-next.haint.fyi/*
   https://frontend-next.haint.fyi/api/auth/callback/keycloak
   ```

6. Review Prometheus scrape targets if you need metrics.

   The chart now scrapes the in-cluster service DNS names for:

   - `api-gateway.microservices.svc.cluster.local:9000`
   - `product-service.microservices.svc.cluster.local:8080`
   - `order-service.microservices.svc.cluster.local:8081`
   - `inventory-service.microservices.svc.cluster.local:8082`
   - `notification-service.microservices.svc.cluster.local:8083`

## Gateway exposure on this VPS

Kubernetes `Service` type `LoadBalancer` does not create an external load balancer by itself. It asks a cloud provider integration to provision one. Managed Kubernetes clusters usually include that integration. A plain VPS Kubernetes cluster usually does not.

On this cluster, changing the NGINX Gateway Fabric data plane service to `LoadBalancer` left it in this state:

```text
EXTERNAL-IP: <pending>
```

That means there is no working cloud load balancer controller for this VPS environment. You can install one only if the VPS provider exposes a compatible load balancer API or cloud-controller-manager, such as an OpenStack Octavia integration, Hetzner Cloud Controller Manager, or another provider-specific controller.

MetalLB is another option for bare-metal or VPS Kubernetes, but it needs an IP address range that the network can route to the cluster. With only the existing node public IP `103.6.234.153`, MetalLB is not the cleanest fit because that IP is already assigned to the host.

For this VPS, the chart uses NGINX Gateway Fabric's data plane as a `DaemonSet` with `hostPort` bindings:

```yaml
nginx:
  kind: daemonSet
  pod:
    tolerations:
      - key: node-role.kubernetes.io/control-plane
        operator: Exists
        effect: NoSchedule
  container:
    hostPorts:
      - port: 80
        containerPort: 80
      - port: 443
        containerPort: 443
  service:
    type: ClusterIP
```

The control-plane toleration is required because the public DNS points to `103.6.234.153`, which is the `k8s-master` node. Running the gateway data plane on that node lets normal browser URLs like `https://frontend.haint.fyi/` reach Kubernetes directly on ports `80` and `443`.

## TLS configuration

The chart now includes both:

- an HTTP listener on port `80`
- an HTTPS listener on port `443`

The HTTPS listener expects a Kubernetes TLS secret named `haint-fyi-tls` in the `microservices` namespace.

For a quick self-signed certificate:

```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout tls.key \
  -out tls.crt \
  -subj "/CN=haint.fyi" \
  -addext "subjectAltName=DNS:haint.fyi,DNS:*.haint.fyi"

kubectl -n microservices create secret tls haint-fyi-tls \
  --cert=tls.crt \
  --key=tls.key
```

If the secret already exists, replace it with:

```bash
kubectl -n microservices delete secret haint-fyi-tls
kubectl -n microservices create secret tls haint-fyi-tls \
  --cert=tls.crt \
  --key=tls.key
```

For production, use a publicly trusted certificate instead of a self-signed one. The Gateway listener can keep the same secret name as long as the certificate secret is `haint-fyi-tls`.

## Install prerequisites

Make sure these are available on the VPS or on the machine you use to administer the cluster:

- `kubectl`
- `helm`
- access to the Kubernetes context for the VPS cluster

For this VPS, the normal workflow is to run Helm from the control plane server:

```bash
ssh root@103.6.234.153
cd /root/spring-boot
```

If the repo is not on the server yet:

```bash
git clone https://github.com/hai2k2tt-tutorial/spring-boot.git /root/spring-boot
cd /root/spring-boot
```

## Build and publish amd64 images

The VPS Kubernetes nodes are `linux/amd64`. Images built on an Apple Silicon Mac default to `linux/arm64` unless you explicitly set the platform. If an arm64-only image is deployed to this cluster, pods fail with errors like:

```text
no match for platform in manifest
exec /cnb/process/web: exec format error
```

Build and push custom images with Docker Buildx before deploying.

Create or select a multi-arch builder:

```bash
docker buildx create --use --name multiarch || docker buildx use multiarch
docker buildx inspect --bootstrap
```

Spring Boot service images used by the chart:

```bash
docker buildx build --platform linux/amd64 \
  -t docker.io/hai2k2tt/api-gateway:0.0.1-SNAPSHOT \
  --push ./api-gateway

docker buildx build --platform linux/amd64 \
  -t docker.io/hai2k2tt/product-service:1.0-SNAPSHOT \
  --push ./product-service

docker buildx build --platform linux/amd64 \
  -t docker.io/hai2k2tt/order-service:1.0-SNAPSHOT \
  --push ./order-service

docker buildx build --platform linux/amd64 \
  -t docker.io/hai2k2tt/inventory-service:1.0-SNAPSHOT \
  --push ./inventory-service

docker buildx build --platform linux/amd64 \
  -t docker.io/hai2k2tt/notification-service:1.0-SNAPSHOT \
  --push ./notification-service
```

Frontend images use separate amd64 tags so the existing arm64 `latest` tags can remain available:

```bash
docker buildx build --platform linux/amd64 \
  -t docker.io/hai2k2tt/frontend:amd64 \
  --push ./frontend

docker buildx build --platform linux/amd64 \
  -t docker.io/hai2k2tt/frontend-next:amd64 \
  --push ./frontend-next
```

Verify the pushed manifests contain `linux/amd64`:

```bash
docker buildx imagetools inspect docker.io/hai2k2tt/api-gateway:0.0.1-SNAPSHOT
docker buildx imagetools inspect docker.io/hai2k2tt/product-service:1.0-SNAPSHOT
docker buildx imagetools inspect docker.io/hai2k2tt/order-service:1.0-SNAPSHOT
docker buildx imagetools inspect docker.io/hai2k2tt/inventory-service:1.0-SNAPSHOT
docker buildx imagetools inspect docker.io/hai2k2tt/notification-service:1.0-SNAPSHOT
docker buildx imagetools inspect docker.io/hai2k2tt/frontend:amd64
docker buildx imagetools inspect docker.io/hai2k2tt/frontend-next:amd64
```

The Helm chart is configured to deploy these image tags:

```yaml
apiGateway:
  image: docker.io/hai2k2tt/api-gateway:0.0.1-SNAPSHOT
productService:
  image: docker.io/hai2k2tt/product-service:1.0-SNAPSHOT
orderService:
  image: docker.io/hai2k2tt/order-service:1.0-SNAPSHOT
inventoryService:
  image: docker.io/hai2k2tt/inventory-service:1.0-SNAPSHOT
notificationService:
  image: docker.io/hai2k2tt/notification-service:1.0-SNAPSHOT
frontend:
  image: docker.io/hai2k2tt/frontend:amd64
frontendNext:
  image: docker.io/hai2k2tt/frontend-next:amd64
```

All custom application images use `imagePullPolicy: Always` so Kubernetes pulls rebuilt tags instead of reusing stale cached images.

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

Create the TLS secret before installing or upgrading the application stack:

```bash
kubectl get secret haint-fyi-tls -n microservices >/dev/null 2>&1 || \
kubectl -n microservices create secret tls haint-fyi-tls \
  --cert=tls.crt \
  --key=tls.key
```

Install or upgrade the application stack:

```bash
helm upgrade --install microservices helm \
  --namespace microservices \
  --create-namespace
```

For an existing VPS checkout, pull the latest chart changes and redeploy:

```bash
cd /root/spring-boot
git pull --ff-only
helm dependency build helm
helm upgrade --install microservices helm \
  --namespace microservices \
  --create-namespace
```

If you republished an image tag and want to force fresh pods immediately:

```bash
kubectl rollout restart deploy/frontend deploy/frontend-next -n microservices
kubectl rollout restart deploy/api-gateway deploy/product-service deploy/order-service deploy/inventory-service deploy/notification-service -n microservices
```

Wait for application rollouts:

```bash
kubectl rollout status deployment/api-gateway -n microservices --timeout=300s
kubectl rollout status deployment/product-service -n microservices --timeout=300s
kubectl rollout status deployment/order-service -n microservices --timeout=300s
kubectl rollout status deployment/inventory-service -n microservices --timeout=300s
kubectl rollout status deployment/notification-service -n microservices --timeout=300s
kubectl rollout status deployment/frontend -n microservices --timeout=300s
kubectl rollout status deployment/frontend-next -n microservices --timeout=300s
```

## Verify

```bash
kubectl get pods -n nginx-gateway
kubectl get pods -n microservices
kubectl get gateway,httproute -n microservices
kubectl get gatewayclass
```

Confirm the deployed images:

```bash
kubectl describe deploy \
  api-gateway \
  product-service \
  order-service \
  inventory-service \
  notification-service \
  frontend \
  frontend-next \
  -n microservices | egrep "^(Name:|Replicas:|    Image:)"
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
| frontend | `frontend.haint.fyi` | `80` | `https://frontend.haint.fyi/` |
| frontend-next | `frontend-next.haint.fyi` | `3001` | `https://frontend-next.haint.fyi/` |
| api-gateway | `api.haint.fyi` | `9000` | `https://api.haint.fyi/` |
| keycloak | `keycloak.haint.fyi` | `8080` | `https://keycloak.haint.fyi/` |
| kafka-ui | `kafka-ui.haint.fyi` | `8080` | `https://kafka-ui.haint.fyi/` |
| grafana | `grafana.haint.fyi` | `3000` | `https://grafana.haint.fyi/` |
| tempo | `tempo.haint.fyi` | `3100` | `https://tempo.haint.fyi/` |
| prometheus | `prometheus.haint.fyi` | `9090` | `https://prometheus.haint.fyi/` |
| mailhog | `mailhog.haint.fyi` | `8025` | `https://mailhog.haint.fyi/` |
| schema-registry | `schema-registry.haint.fyi` | `8081` | `https://schema-registry.haint.fyi/` |
| loki | `loki.haint.fyi` | `3100` | `https://loki.haint.fyi/` |

## Value checklist

If you want a single checklist for the VPS install, update these files:

- `helm/values.yaml`
- `helm/charts/k8s-gateway/values.yaml`
- `helm/charts/applications/values.yaml`
- `helm/charts/infrastructure/charts/keycloak/values.yaml`
- `helm/charts/infrastructure/charts/observability/charts/prometheus/templates/prometheus-configmap.yaml`

## Notes

- The chart now defines both HTTP and HTTPS Gateway listeners.
- Browsers will warn on the self-signed certificate until you trust it locally. Use a public CA-issued certificate for normal production access.
- Keep `frontend:latest` and `frontend-next:latest` for arm64 if you still use them elsewhere. The VPS chart intentionally uses `frontend:amd64` and `frontend-next:amd64`.
- The local `kind` install guide in `README.md` still applies to Docker-based development, but it is not the right path for this VPS deployment.
