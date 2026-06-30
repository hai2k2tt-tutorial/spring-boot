# Microservices Helm Install on VPS

This guide is for an Ubuntu 24 VPS with Kubernetes already installed.

Your current control plane IP is `103.6.234.153` and the public domain is `haint.fyi`.

The chart defaults in `/helm` are now aligned to this VPS deployment:

- public domain: `haint.fyi`
- control plane IP: `103.6.234.153`
- public gateway entrypoint: `http://*.haint.fyi`
- Kubernetes node architecture: `linux/amd64`
- internal service-to-service traffic stays on cluster DNS under `microservices.svc.cluster.local`

## What this chart installs

- `microservices` namespace
- Metrics Server for `kubectl top` and the Kubernetes resource metrics API
- Infrastructure: MySQL, MongoDB, Kafka, Keycloak, Mailpit, Grafana, Prometheus, Loki, Tempo
- Applications: API gateway, product service, order service, inventory service, notification service, admin-fe, shop-fe, customer-fe-next
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

   The bundled Gateway resource exposes HTTP on port `80` through the NGINX Gateway Fabric data plane running with host ports.

   ```text
   TCP 80
   ```

3. Update the local-only hostnames in the chart values.

   Replace the default `*.local` hostnames with your own domain names in `helm/charts/k8s-gateway/values.yaml`.

   Recommended hostnames for this setup:

   - `admin-fe.haint.fyi`
   - `shop-fe.haint.fyi`
   - `customer-fe-next.haint.fyi`
   - `api.haint.fyi`
   - `keycloak.haint.fyi`
   - `kafka-ui.haint.fyi`
   - `schema-registry.haint.fyi`

4. Update application URLs.

   At minimum, adjust these values in `helm/charts/applications/values.yaml`:

   - `apiGateway.config.issuerUri`
   - `adminFe.config.nextPublicApiBaseUrl`
   - `adminFe.config.authUrl`
   - `adminFe.config.authIssuer`
   - `shopFe.config.nextPublicApiBaseUrl`
   - `shopFe.config.authUrl`
   - `shopFe.config.authIssuer`
   - `customerFeNext.config.nextPublicApiBaseUrl`
   - `customerFeNext.config.authUrl`
   - `customerFeNext.config.authIssuer`

   Keep the internal cluster DNS entries if they still match your service names.

   For `haint.fyi`, the public values should look like this:

   ```yaml
   apiGateway:
     config:
       customerIssuerUri: http://keycloak.haint.fyi/realms/ecommerce-customer
       shopIssuerUri: http://keycloak.haint.fyi/realms/ecommerce-shop
       adminIssuerUri: http://keycloak.haint.fyi/realms/ecommerce-admin

   infrastructure:
     keycloak:
       # KC_HOSTNAME must be a bare hostname in this chart. Do not include http://.
       hostname: keycloak.haint.fyi

   customerFeNext:
     config:
       nextPublicApiBaseUrl: http://api.haint.fyi/api
       authUrl: http://customer-fe-next.haint.fyi
       authIssuer: http://keycloak.haint.fyi/realms/ecommerce-customer
   ```

5. Review Keycloak redirect URIs.

   The chart defaults now include:

   ```text
   http://admin-fe.haint.fyi
   http://admin-fe.haint.fyi/*
   http://admin-fe.haint.fyi/api/auth/callback/keycloak
   http://shop-fe.haint.fyi
   http://shop-fe.haint.fyi/*
   http://shop-fe.haint.fyi/api/auth/callback/keycloak
   http://customer-fe-next.haint.fyi
   http://customer-fe-next.haint.fyi/*
   http://customer-fe-next.haint.fyi/api/auth/callback/keycloak
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

The control-plane toleration is required because the public DNS points to `103.6.234.153`, which is the `k8s-master` node. Running the gateway data plane on that node lets normal browser URLs like `http://admin-fe.haint.fyi/` reach Kubernetes directly on port `80`.

## HTTP configuration

The chart now includes:

- an HTTP listener on port `80`

There is no HTTPS listener and no TLS secret requirement in the HTTP-only setup.

Keycloak in this chart is configured with HTTP enabled and `KC_HOSTNAME_STRICT_HTTPS=false`. Keep the Keycloak `hostname` value as a bare host such as `keycloak.haint.fyi`; use full `http://...` URLs only for OIDC issuer URLs and redirect URIs.

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

## Build and publish multi-arch images

Local Docker on Apple Silicon uses `linux/arm64` by default, while the VPS Kubernetes nodes are `linux/amd64`. This repo publishes fixed architecture tags so each environment can pull an exact image. If you publish only arm64 and deploy it to the VPS, pods fail with errors like:

```text
no match for platform in manifest
exec /cnb/process/web: exec format error
```

Build and push the application images before deploying.

Create or select a multi-arch builder:

```bash
docker buildx create --use --name multiarch || docker buildx use multiarch
docker buildx inspect --bootstrap
```

Then publish the repo images with the shared script:

```bash
export DOCKER_USERNAME=hai2k2tt
export DOCKER_PASSWORD='...'
export IMAGE_TAG=2
export PLATFORMS=linux/amd64,linux/arm64

./scripts/docker-build-v2.sh
```

To rebuild only the API gateway and frontend images as amd64, arm64, and multi-arch tags:

```bash
export DOCKER_USERNAME=hai2k2tt
export DOCKER_PASSWORD='...'
export IMAGE_TAG=2
export PLATFORMS=linux/amd64,linux/arm64
export BACKEND_MODULES="api-gateway"
export FRONTEND_APPS="admin-fe shop-fe customer-fe-next"

./scripts/docker-build-v2.sh
```

The script does two different things:

- Spring Boot services are packaged with Maven, then built once per platform with `docker buildx build` using `docker/spring-boot/Dockerfile`.
- Frontend apps are built once per platform with `docker buildx build`.
- For each image, the script pushes architecture-specific tags such as `:2-amd64` and `:2-arm64`, then creates the shared multi-arch manifest tag `:2`.
- Each architecture build is retried and verified in Docker Hub before the manifest tag is created. This helps recover from long Docker Hub or BuildKit push hangs.

The retry defaults are:

```bash
export BUILD_RETRIES=3
export BUILD_TIMEOUT_SECONDS=3600
export RETRY_DELAY_SECONDS=15
export REGISTRY_VERIFY_RETRIES=6
export REGISTRY_VERIFY_DELAY_SECONDS=10
export DOCKER_BUILD_PROGRESS=plain
export RESUME_PUBLISHED_IMAGES=false
```

For a failed partial publish, set `RESUME_PUBLISHED_IMAGES=true` before rerunning the script. Existing architecture tags are reused, missing tags are built, and the shared manifest tag is recreated after verification.

You can verify the separate architecture tags and the shared multi-arch tag:

```bash
docker buildx imagetools inspect docker.io/hai2k2tt/api-gateway:2-amd64
docker buildx imagetools inspect docker.io/hai2k2tt/api-gateway:2-arm64
docker buildx imagetools inspect docker.io/hai2k2tt/api-gateway:2

docker buildx imagetools inspect docker.io/hai2k2tt/admin-fe:2-amd64
docker buildx imagetools inspect docker.io/hai2k2tt/admin-fe:2-arm64
docker buildx imagetools inspect docker.io/hai2k2tt/admin-fe:2
```

If you need an amd64-only publish for debugging, set:

```bash
export PLATFORMS=linux/amd64
export CREATE_MANIFEST=false
./scripts/docker-build-v2.sh
```

The Helm values for the VPS should reference the amd64 tag explicitly. For example:

```yaml
image: docker.io/hai2k2tt/api-gateway:2-amd64
```

Local Docker Compose and raw local K8s manifests should use the arm64 tag on Apple Silicon:

```yaml
image: docker.io/hai2k2tt/api-gateway:2-arm64
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

Install or upgrade the application stack:

```bash
helm upgrade --install microservices helm \
  --namespace microservices \
  --create-namespace
```

Metrics Server is enabled by default in the umbrella chart:

```yaml
metricsServer:
  enabled: true
```

The chart deploys Metrics Server `v0.8.1` with `--kubelet-insecure-tls`, which is commonly required on small VPS clusters where kubelet serving certificates do not match the node names used by Metrics Server.

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
kubectl rollout restart deploy/admin-fe deploy/shop-fe deploy/customer-fe-next -n microservices
kubectl rollout restart deploy/api-gateway deploy/product-service deploy/order-service deploy/inventory-service deploy/notification-service deploy/payment-service deploy/shop-service deploy/customer-service -n microservices
```

Wait for application rollouts:

```bash
kubectl rollout status deployment/api-gateway -n microservices --timeout=300s
kubectl rollout status deployment/product-service -n microservices --timeout=300s
kubectl rollout status deployment/order-service -n microservices --timeout=300s
kubectl rollout status deployment/inventory-service -n microservices --timeout=300s
kubectl rollout status deployment/notification-service -n microservices --timeout=300s
kubectl rollout status deployment/payment-service -n microservices --timeout=300s
kubectl rollout status deployment/shop-service -n microservices --timeout=300s
kubectl rollout status deployment/customer-service -n microservices --timeout=300s
kubectl rollout status deployment/admin-fe -n microservices --timeout=300s
kubectl rollout status deployment/shop-fe -n microservices --timeout=300s
kubectl rollout status deployment/customer-fe-next -n microservices --timeout=300s
```

Wait for Metrics Server:

```bash
kubectl rollout status deployment/metrics-server -n microservices --timeout=180s
kubectl wait --for=condition=Available apiservice/v1beta1.metrics.k8s.io --timeout=180s
```

## Verify

```bash
kubectl get pods -n nginx-gateway
kubectl get pods -n microservices
kubectl get gateway,httproute -n microservices
kubectl get gatewayclass
kubectl get apiservice v1beta1.metrics.k8s.io
kubectl top nodes
kubectl top pods -n microservices
```

Confirm the deployed images:

```bash
kubectl describe deploy \
  api-gateway \
  product-service \
  order-service \
  inventory-service \
  notification-service \
  payment-service \
  shop-service \
  customer-service \
  admin-fe \
  shop-fe \
  customer-fe-next \
  -n microservices | egrep "^(Name:|Replicas:|    Image:)"
```

## Access the services

Use the domain names you configured in the gateway routes.

Service map for `haint.fyi`, assuming you kept the same route names:

| Service | Hostname | Backend port | Public URL |
| --- | --- | --- | --- |
| admin-fe | `admin-fe.haint.fyi` | `3002` | `http://admin-fe.haint.fyi/` |
| shop-fe | `shop-fe.haint.fyi` | `3003` | `http://shop-fe.haint.fyi/` |
| customer-fe-next | `customer-fe-next.haint.fyi` | `3004` | `http://customer-fe-next.haint.fyi/` |
| api-gateway | `api.haint.fyi` | `9000` | `http://api.haint.fyi/` |
| keycloak | `keycloak.haint.fyi` | `8080` | `http://keycloak.haint.fyi/` |
| kafka-ui | `kafka-ui.haint.fyi` | `8080` | `http://kafka-ui.haint.fyi/` |
| schema-registry | `schema-registry.haint.fyi` | `8081` | `http://schema-registry.haint.fyi/` |

## Value checklist

If you want a single checklist for the VPS install, update these files:

- `helm/values.yaml`
- `helm/charts/k8s-gateway/values.yaml`
- `helm/charts/applications/values.yaml`
- `helm/charts/infrastructure/charts/keycloak/values.yaml`

## Basic Helm maintenance commands

Run these from `/root/spring-boot` on the control plane server unless noted otherwise.

Show installed releases:

```bash
helm list -A
```

Refresh local chart dependencies after pulling repo changes:

```bash
helm dependency build helm
```

Preview rendered Kubernetes manifests without applying them:

```bash
helm template microservices helm --namespace microservices
```

Upgrade or install the cluster stack:

```bash
helm upgrade --install microservices helm \
  --namespace microservices \
  --create-namespace
```

Check release history:

```bash
helm history microservices -n microservices
```

Rollback to a previous revision:

```bash
helm rollback microservices <revision> -n microservices
```

Show the currently deployed values:

```bash
helm get values microservices -n microservices
```

Show all computed values, including chart defaults:

```bash
helm get values microservices -n microservices --all
```

Show rendered manifests from the current release:

```bash
helm get manifest microservices -n microservices
```

Uninstall the stack:

```bash
helm uninstall microservices -n microservices
```

## Notes

- The chart now defines only an HTTP Gateway listener.
- HTTP-only public access is not recommended for real production traffic. Use a public CA-issued certificate and restore HTTPS when this deployment handles real users or sensitive data.
- The local `kind` install guide in `README.md` still applies to Docker-based development, but it is not the right path for this VPS deployment.
