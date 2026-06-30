# Kubernetes and Helm Production VPS Guide

This guide deploys the `/helm` chart to a production-style VPS Kubernetes
cluster from a fresh server through DNS, TLS, Helm install, database migration,
verification, upgrades, and rollback.

The chart is currently wired for the domain `haint.fyi`. Replace that domain,
the email address, image repository, and all generated secrets before deploying
your own environment.

## What This Chart Deploys

There are two Helm releases plus one required cert-manager release:

| Release | Namespace | Purpose |
| --- | --- | --- |
| `cert-manager` | `cert-manager` | ACME certificates for Gateway API HTTP-01 validation |
| `ngf` | `nginx-gateway` | NGINX Gateway Fabric controller and data plane |
| `microservices` | `microservices` | Metrics Server, infrastructure, applications, Gateway, HTTPRoutes, TLS certificate |

The `microservices` umbrella chart contains these subcharts:

- `metrics-server`, enabled by `metricsServer.enabled`
- `infrastructure`: Postgres, MinIO, Kafka, Zookeeper, Schema Registry,
  Kafka UI, Keycloak, Keycloak MySQL, Redis, Mailpit, Grafana, Prometheus,
  Loki, Tempo, optional MongoDB
- `applications`: API gateway, backend services, and frontend apps
- `k8s-gateway`: `Gateway`, `HTTPRoute`, cert-manager `ClusterIssuer`,
  cert-manager `Certificate`, and NGINX `ProxySettingsPolicy`

The NGINX Gateway Fabric values in `gateway-controller/values.yaml` run the data
plane as a `DaemonSet` with `hostPort` bindings for `80` and `443`. This is
intentional for a plain VPS: DNS points directly to the VPS public IP and no
cloud `LoadBalancer` is required.

## Production Assumptions

Use this guide for a single VPS or a small manually managed VPS cluster.

Recommended baseline:

- Ubuntu 24.04 LTS
- 4 vCPU and 8 GB RAM minimum for the full stack
- 40 GB or more disk, with backups for `/data`
- Public IPv4 address
- Root or sudo access
- DNS control for your domain
- Docker Hub or another image registry containing the application images

This chart is not a high-availability production platform by itself. It uses
single-replica stateful services and `hostPath` volumes under `/data`. For
serious production traffic, add backups, monitoring, restricted public routes,
secret management, and a recovery plan before handling real users or payments.

## 1. Prepare DNS

Point the domain names used by `k8sGateway.routes` to the VPS public IP.

For the current `haint.fyi` defaults:

```text
haint.fyi                         A  <VPS_PUBLIC_IP>
*.haint.fyi                       A  <VPS_PUBLIC_IP>
```

If your DNS provider does not support wildcard records, create individual `A`
records:

```text
api.haint.fyi                     A  <VPS_PUBLIC_IP>
keycloak.haint.fyi                A  <VPS_PUBLIC_IP>
landing-fe.haint.fyi              A  <VPS_PUBLIC_IP>
admin-fe.haint.fyi                A  <VPS_PUBLIC_IP>
shop-fe.haint.fyi                 A  <VPS_PUBLIC_IP>
customer-fe-next.haint.fyi        A  <VPS_PUBLIC_IP>
customer-wallet-fe.haint.fyi      A  <VPS_PUBLIC_IP>
shop-wallet-fe.haint.fyi          A  <VPS_PUBLIC_IP>
minio.haint.fyi                   A  <VPS_PUBLIC_IP>
kafka-ui.haint.fyi                A  <VPS_PUBLIC_IP>
schema-registry.haint.fyi         A  <VPS_PUBLIC_IP>
```

Keep port `80` open permanently. Let's Encrypt HTTP-01 validation uses it even
when users access the site through HTTPS.

## 2. Prepare The VPS

Run the host preparation on the VPS:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git jq openssl ufw

sudo swapoff -a
sudo sed -i.bak '/ swap / s/^/#/' /etc/fstab

sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status
```

Create the host directories used by the chart's static `hostPath` volumes:

```bash
sudo mkdir -p /data/postgres /data/minio /data/keycloak-mysql /data/mongodb
sudo chmod 0777 /data/postgres /data/minio /data/keycloak-mysql /data/mongodb
```

The chart creates static PV/PVC pairs for:

| Workload | PV | PVC | Host path |
| --- | --- | --- | --- |
| Postgres | `postgres-pv` | `postgres-pvc` | `/data/postgres` |
| MinIO | `minio-pv` | `minio-pvc` | `/data/minio` |
| Keycloak MySQL | `keycloak-mysql-pv` | `keycloak-mysql-pvc` | `/data/keycloak-mysql` |
| MongoDB, if enabled | `mongodb-pv` | `mongodb-pvc` | `/data/mongodb` |

Postgres and MinIO size/path/class are value-driven. Keycloak MySQL, Tempo, and
MongoDB currently have static templates with 1 Gi requests and `standard`
storage class.

## 3. Install Kubernetes

If you already have Kubernetes, skip to the validation commands below. For a
fresh single VPS, K3s is the simplest Kubernetes distribution.

Install K3s without Traefik, ServiceLB, or its bundled Metrics Server. The Helm
chart installs its own Gateway controller and Metrics Server.

```bash
curl -sfL https://get.k3s.io | \
  INSTALL_K3S_EXEC="--disable=traefik --disable=servicelb --disable=metrics-server" \
  sh -

sudo kubectl get nodes -o wide
```

For non-root administration:

```bash
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown "$USER:$USER" ~/.kube/config
chmod 600 ~/.kube/config
kubectl get nodes
```

If you use kubeadm instead of K3s on a single-node cluster, remove the default
control-plane taint or the application pods will not schedule:

```bash
kubectl taint nodes --all node-role.kubernetes.io/control-plane- || true
```

Validate that ports `80` and `443` are free before installing NGINX Gateway
Fabric:

```bash
sudo ss -ltnp | grep -E ':80|:443' || true
```

No other host service should bind those ports.

## 4. Install Helm

Install Helm on the machine that will run deployments:

```bash
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

helm version
kubectl version --client
kubectl get nodes
```

Clone the repository on the VPS:

```bash
git clone https://github.com/hai2k2tt-tutorial/spring-boot.git /root/spring-boot
cd /root/spring-boot
```

If the repository already exists:

```bash
cd /root/spring-boot
git pull --ff-only
```

## 5. Create A Production Values File

Do not commit real production secrets into the repo. Keep an override file
outside Git, for example:

```bash
sudo mkdir -p /root/helm-values
sudo chmod 0700 /root/helm-values
```

Generate application secrets:

```bash
openssl rand -base64 48
openssl rand -base64 48
openssl rand -base64 48
openssl rand -base64 48
openssl rand -base64 48
```

Create `/root/helm-values/microservices-production.yaml` and adjust the values:

```yaml
global:
  workloadScheduling:
    # Use null on a single-node VPS or when your node is not named k8s-worker.
    # The chart default is kubernetes.io/hostname: k8s-worker.
    nodeSelector: null
    tolerations: []
    affinity: {}

metricsServer:
  enabled: true

infrastructure:
  postgres:
    password: "CHANGE_ME_POSTGRES_PASSWORD"
    persistence:
      storageClassName: standard
      size: 20Gi
      hostPath: /data/postgres
  minio:
    rootUser: "CHANGE_ME_MINIO_USER"
    rootPassword: "CHANGE_ME_MINIO_PASSWORD"
    persistence:
      storageClassName: standard
      size: 20Gi
      hostPath: /data/minio
  keycloak:
    hostname: keycloak.haint.fyi
    # The Keycloak admin username is currently hardcoded as admin in the
    # keycloak-config template. This value controls the generated admin password.
    adminPassword: "CHANGE_ME_KEYCLOAK_ADMIN_PASSWORD"
    dbPassword: "CHANGE_ME_KEYCLOAK_DB_PASSWORD"
    keycloak-mysql:
      rootPassword: "CHANGE_ME_KEYCLOAK_MYSQL_ROOT_PASSWORD"
      password: "CHANGE_ME_KEYCLOAK_DB_PASSWORD"

applications:
  apiGateway:
    image: docker.io/hai2k2tt/api-gateway:2-amd64
    imagePullPolicy: Always
    config:
      customerIssuerUri: https://keycloak.haint.fyi/realms/ecommerce-customer
      customerJwkSetUri: http://keycloak.microservices.svc.cluster.local:8080/realms/ecommerce-customer/protocol/openid-connect/certs
      shopIssuerUri: https://keycloak.haint.fyi/realms/ecommerce-shop
      shopJwkSetUri: http://keycloak.microservices.svc.cluster.local:8080/realms/ecommerce-shop/protocol/openid-connect/certs
      adminIssuerUri: https://keycloak.haint.fyi/realms/ecommerce-admin
      adminJwkSetUri: http://keycloak.microservices.svc.cluster.local:8080/realms/ecommerce-admin/protocol/openid-connect/certs

  productService:
    image: docker.io/hai2k2tt/product-service:2-amd64
    config:
      minioPublicEndpoint: https://minio.haint.fyi

  orderService:
    image: docker.io/hai2k2tt/order-service:2-amd64
  inventoryService:
    image: docker.io/hai2k2tt/inventory-service:2-amd64
  notificationService:
    image: docker.io/hai2k2tt/notification-service:2-amd64
  paymentService:
    image: docker.io/hai2k2tt/payment-service:2-amd64
  walletService:
    image: docker.io/hai2k2tt/wallet-service:2-amd64
  shopService:
    image: docker.io/hai2k2tt/shop-service:2-amd64
  customerService:
    image: docker.io/hai2k2tt/customer-service:2-amd64

  landingFe:
    image: docker.io/hai2k2tt/landing-fe:2-amd64
    config:
      adminFeUrl: https://admin-fe.haint.fyi
      shopFeUrl: https://shop-fe.haint.fyi
      customerFeUrl: https://customer-fe-next.haint.fyi
      customerWalletFeUrl: https://customer-wallet-fe.haint.fyi
      shopWalletFeUrl: https://shop-wallet-fe.haint.fyi

  adminFe:
    image: docker.io/hai2k2tt/admin-fe:2-amd64
    config:
      nextPublicApiBaseUrl: https://api.haint.fyi/api
      authUrl: https://admin-fe.haint.fyi
      authIssuer: https://keycloak.haint.fyi/realms/ecommerce-admin
      authIssuerInternal: http://keycloak.microservices.svc.cluster.local:8080/realms/ecommerce-admin
      authClientId: admin-fe-client
      authClientSecret: ""
      authBasePath: /api/admin-fe/auth
      authSecret: "CHANGE_ME_ADMIN_FE_AUTH_SECRET"

  shopFe:
    image: docker.io/hai2k2tt/shop-fe:2-amd64
    config:
      nextPublicApiBaseUrl: https://api.haint.fyi/api
      authUrl: https://shop-fe.haint.fyi
      authIssuer: https://keycloak.haint.fyi/realms/ecommerce-shop
      authIssuerInternal: http://keycloak.microservices.svc.cluster.local:8080/realms/ecommerce-shop
      authClientId: shop-fe-client
      authClientSecret: ""
      authBasePath: /api/shop-fe/auth
      authSecret: "CHANGE_ME_SHOP_FE_AUTH_SECRET"

  customerFeNext:
    image: docker.io/hai2k2tt/customer-fe-next:2-amd64
    config:
      nextPublicApiBaseUrl: https://api.haint.fyi/api
      authUrl: https://customer-fe-next.haint.fyi
      authIssuer: https://keycloak.haint.fyi/realms/ecommerce-customer
      authIssuerInternal: http://keycloak.microservices.svc.cluster.local:8080/realms/ecommerce-customer
      authClientId: customer-fe-client
      authClientSecret: ""
      authBasePath: /api/customer-fe-next/auth
      authSecret: "CHANGE_ME_CUSTOMER_FE_AUTH_SECRET"

  customerWalletFe:
    image: docker.io/hai2k2tt/customer-wallet-fe:2-amd64
    config:
      nextPublicApiBaseUrl: https://api.haint.fyi/api
      authUrl: https://customer-wallet-fe.haint.fyi
      authIssuer: https://keycloak.haint.fyi/realms/ecommerce-customer
      authIssuerInternal: http://keycloak.microservices.svc.cluster.local:8080/realms/ecommerce-customer
      authClientId: customer-fe-client
      authClientSecret: ""
      authBasePath: /api/customer-wallet-fe/auth
      authSecret: "CHANGE_ME_CUSTOMER_WALLET_FE_AUTH_SECRET"

  shopWalletFe:
    image: docker.io/hai2k2tt/shop-wallet-fe:2-amd64
    config:
      nextPublicApiBaseUrl: https://api.haint.fyi/api
      authUrl: https://shop-wallet-fe.haint.fyi
      authIssuer: https://keycloak.haint.fyi/realms/ecommerce-shop
      authIssuerInternal: http://keycloak.microservices.svc.cluster.local:8080/realms/ecommerce-shop
      authClientId: shop-fe-client
      authClientSecret: ""
      authBasePath: /api/shop-wallet-fe/auth
      authSecret: "CHANGE_ME_SHOP_WALLET_FE_AUTH_SECRET"

k8sGateway:
  enabled: true
  certManager:
    enabled: true
    clusterIssuer:
      create: true
      name: letsencrypt-prod
      email: admin@haint.fyi
      server: https://acme-v02.api.letsencrypt.org/directory
      privateKeySecretRefName: letsencrypt-prod-account-key
    certificate:
      create: true
      name: haint-fyi-tls
      secretName: haint-fyi-tls
      issuerRef:
        name: letsencrypt-prod
        kind: ClusterIssuer
      # Empty means the chart uses every hostname in k8sGateway.routes.
      dnsNames: []
```

If your VPS nodes are not `linux/amd64`, change every application image tag to
the correct architecture tag. The existing VPS defaults use `:2-amd64`.

## 6. Domain And Keycloak Notes

For `haint.fyi`, the chart already contains HTTPS issuer URLs and public
frontend URLs. For any other domain, update all these areas:

- `k8sGateway.routes[*].hostname`
- `k8sGateway.certManager.clusterIssuer.email`
- `k8sGateway.certManager.certificate.secretName` and listener certificate refs
  if you rename the TLS secret
- `infrastructure.keycloak.hostname`
- `applications.apiGateway.config.*IssuerUri`
- frontend `authUrl`, `authIssuer`, `nextPublicApiBaseUrl`, and landing page URLs
- `applications.productService.config.minioPublicEndpoint`
- Keycloak realm redirect URIs in
  `charts/infrastructure/charts/keycloak/templates/configmap.yaml`

The `infrastructure.keycloak.redirectUris` value exists, but the current
Keycloak realm import template has redirect URIs hardcoded. Search for
`haint.fyi` in the Helm chart if you change the domain:

```bash
rg -n "haint\\.fyi|\\.local|localhost" helm
```

## 7. Restrict Public Routes Before Real Production

The default `k8sGateway.routes` exposes operational tools publicly:

- Kafka UI
- Grafana
- Prometheus
- Tempo
- Loki
- Mailpit
- Schema Registry
- MinIO API

That is convenient for a demo, but it is not a safe public production default.
Before handling real traffic, either remove those HTTPRoutes from the production
values, put them behind a VPN, or add authentication and IP restrictions at the
gateway/provider layer.

At minimum, expose only:

- `landing-fe`
- `admin-fe`
- `shop-fe`
- `customer-fe-next`
- `customer-wallet-fe`
- `shop-wallet-fe`
- `api`
- `keycloak`
- `minio`, only if product images must be served through this public host

Because the cert-manager `Certificate` defaults to all route hostnames, removing
a route also removes that hostname from the requested certificate.

## 8. Install Gateway CRDs

Gateway API CRDs and NGINX Gateway Fabric CRDs are cluster-level prerequisites.
Install them once:

```bash
cd /root/spring-boot
./helm/scripts/install-gateway-api-crds.sh
```

Verify:

```bash
kubectl get crd gateways.gateway.networking.k8s.io
kubectl get crd httproutes.gateway.networking.k8s.io
kubectl get crd nginxgateways.gateway.nginx.org
kubectl get crd nginxproxies.gateway.nginx.org
```

## 9. Install cert-manager

cert-manager must be installed before the `microservices` chart because the
chart renders `ClusterIssuer` and `Certificate` resources.

```bash
helm upgrade --install cert-manager oci://quay.io/jetstack/charts/cert-manager \
  --version v1.20.2 \
  --namespace cert-manager \
  --create-namespace \
  --set crds.enabled=true \
  --set config.enableGatewayAPI=true \
  --set webhook.hostNetwork=true \
  --set webhook.securePort=10260
```

Wait for it:

```bash
kubectl wait --timeout=5m -n cert-manager deployment/cert-manager --for=condition=Available
kubectl wait --timeout=5m -n cert-manager deployment/cert-manager-webhook --for=condition=Available
kubectl wait --timeout=5m -n cert-manager deployment/cert-manager-cainjector --for=condition=Available
```

If Gateway API CRDs were installed after cert-manager started, restart it:

```bash
kubectl rollout restart deployment cert-manager -n cert-manager
kubectl rollout status deployment cert-manager -n cert-manager --timeout=300s
```

## 10. Install NGINX Gateway Fabric

Install the gateway controller as a separate Helm release:

```bash
helm upgrade --install ngf oci://ghcr.io/nginx/charts/nginx-gateway-fabric \
  --namespace nginx-gateway \
  --create-namespace \
  -f helm/gateway-controller/values.yaml
```

Wait for the controller:

```bash
kubectl wait --timeout=5m -n nginx-gateway deployment/ngf-nginx-gateway-fabric --for=condition=Available
kubectl get pods -n nginx-gateway -o wide
```

Confirm the data plane can bind host ports:

```bash
kubectl get daemonset -n nginx-gateway
kubectl describe pod -n nginx-gateway -l app.kubernetes.io/name=nginx-gateway-fabric
```

If pods fail with host port conflicts, stop the host service using port `80` or
`443`, or disable any bundled ingress controller such as Traefik.

## 11. Build Or Publish Images

The VPS values use exact architecture tags such as `:2-amd64`. If you publish
only `arm64` images from an Apple Silicon laptop, the VPS pods can fail with
platform errors.

Build and push all images:

```bash
export DOCKER_USERNAME=hai2k2tt
export DOCKER_PASSWORD='CHANGE_ME_DOCKER_TOKEN'
export IMAGE_TAG=2
export PLATFORMS=linux/amd64,linux/arm64

./scripts/docker-build-v2.sh
```

For an amd64-only VPS publish:

```bash
export DOCKER_USERNAME=hai2k2tt
export DOCKER_PASSWORD='CHANGE_ME_DOCKER_TOKEN'
export IMAGE_TAG=2
export PLATFORMS=linux/amd64
export CREATE_MANIFEST=false

./scripts/docker-build-v2.sh
```

Verify a pushed image:

```bash
docker buildx imagetools inspect docker.io/hai2k2tt/api-gateway:2-amd64
docker buildx imagetools inspect docker.io/hai2k2tt/admin-fe:2-amd64
```

If your images are private, create an image pull secret and set
`imagePullSecrets` support in the chart before deploying. The current
application templates do not define `imagePullSecrets`.

## 12. Render And Install The Stack

Build local chart dependencies:

```bash
cd /root/spring-boot
helm dependency build helm
```

Preview the rendered manifests:

```bash
helm template microservices helm \
  --namespace microservices \
  -f /root/helm-values/microservices-production.yaml > /tmp/microservices.yaml

kubectl apply --dry-run=server -f /tmp/microservices.yaml
```

Install or upgrade:

```bash
helm upgrade --install microservices helm \
  --namespace microservices \
  --create-namespace \
  -f /root/helm-values/microservices-production.yaml
```

Wait for core infrastructure:

```bash
kubectl rollout status statefulset/postgres -n microservices --timeout=300s
kubectl rollout status statefulset/minio -n microservices --timeout=300s
kubectl rollout status statefulset/keycloak-mysql -n microservices --timeout=300s
kubectl rollout status deployment/keycloak-deployment -n microservices --timeout=300s
```

Wait for applications:

```bash
for deploy in \
  api-gateway \
  product-service \
  order-service \
  inventory-service \
  notification-service \
  payment-service \
  wallet-service \
  shop-service \
  customer-service \
  landing-fe \
  admin-fe \
  shop-fe \
  customer-fe-next \
  customer-wallet-fe \
  shop-wallet-fe
do
  kubectl rollout status "deployment/${deploy}" -n microservices --timeout=300s
done
```

## 13. Verify TLS

Check cert-manager resources:

```bash
kubectl get clusterissuer letsencrypt-prod
kubectl get certificate -n microservices
kubectl describe certificate haint-fyi-tls -n microservices
kubectl get secret haint-fyi-tls -n microservices
```

If the certificate is not ready:

```bash
kubectl get certificaterequest,order,challenge -n microservices
kubectl describe challenge -n microservices
```

Common causes:

- DNS does not point to the VPS public IP.
- Port `80` is blocked.
- NGINX Gateway Fabric is not bound to host port `80`.
- cert-manager was installed without `config.enableGatewayAPI=true`.
- The API server cannot reach the cert-manager webhook. This guide uses
  `webhook.hostNetwork=true` and `webhook.securePort=10260` for that reason.

## 14. Verify Kubernetes And Routes

Run:

```bash
kubectl get pods -n nginx-gateway -o wide
kubectl get pods -n microservices -o wide
kubectl get pv,pvc -n microservices
kubectl get gatewayclass
kubectl get gateway,httproute -n microservices
kubectl get apiservice v1beta1.metrics.k8s.io
kubectl top nodes
kubectl top pods -n microservices
```

Confirm public access:

```bash
curl -I https://api.haint.fyi
curl -I https://keycloak.haint.fyi
curl -I https://landing-fe.haint.fyi
curl -I https://admin-fe.haint.fyi
curl -I https://shop-fe.haint.fyi
curl -I https://customer-fe-next.haint.fyi
```

Check deployed images:

```bash
kubectl describe deploy \
  api-gateway \
  product-service \
  order-service \
  inventory-service \
  notification-service \
  payment-service \
  wallet-service \
  shop-service \
  customer-service \
  landing-fe \
  admin-fe \
  shop-fe \
  customer-fe-next \
  customer-wallet-fe \
  shop-wallet-fe \
  -n microservices | grep -E "^(Name:|Replicas:|    Image:)"
```

## 15. Run Manual Database Migrations

Runtime Liquibase is disabled in the services, so run migrations before relying
on application pods that validate schema.

Run from the VPS checkout:

```bash
cd /root/spring-boot

LIQUIBASE_USERNAME=postgres LIQUIBASE_PASSWORD='CHANGE_ME_POSTGRES_PASSWORD' \
LIQUIBASE_URL=jdbc:postgresql://postgres.microservices.svc.cluster.local:5432/product_service \
sh product-service/scripts/db.sh update

LIQUIBASE_USERNAME=postgres LIQUIBASE_PASSWORD='CHANGE_ME_POSTGRES_PASSWORD' \
LIQUIBASE_URL=jdbc:postgresql://postgres.microservices.svc.cluster.local:5432/payment_service \
sh payment-service/scripts/db.sh update

LIQUIBASE_USERNAME=postgres LIQUIBASE_PASSWORD='CHANGE_ME_POSTGRES_PASSWORD' \
LIQUIBASE_URL=jdbc:postgresql://postgres.microservices.svc.cluster.local:5432/shop_service \
sh shop-service/scripts/db.sh update

LIQUIBASE_USERNAME=postgres LIQUIBASE_PASSWORD='CHANGE_ME_POSTGRES_PASSWORD' \
LIQUIBASE_URL=jdbc:postgresql://postgres.microservices.svc.cluster.local:5432/customer_service \
sh customer-service/scripts/db.sh update

LIQUIBASE_USERNAME=postgres LIQUIBASE_PASSWORD='CHANGE_ME_POSTGRES_PASSWORD' \
LIQUIBASE_URL=jdbc:postgresql://postgres.microservices.svc.cluster.local:5432/order_service \
sh order-service/scripts/db.sh update

LIQUIBASE_USERNAME=postgres LIQUIBASE_PASSWORD='CHANGE_ME_POSTGRES_PASSWORD' \
LIQUIBASE_URL=jdbc:postgresql://postgres.microservices.svc.cluster.local:5432/inventory_service \
sh inventory-service/scripts/db.sh update

LIQUIBASE_USERNAME=postgres LIQUIBASE_PASSWORD='CHANGE_ME_POSTGRES_PASSWORD' \
LIQUIBASE_URL=jdbc:postgresql://postgres.microservices.svc.cluster.local:5432/wallet_service \
sh wallet-service/scripts/db.sh update
```

Restart affected services after migrations:

```bash
kubectl rollout restart deployment/product-service deployment/payment-service \
  deployment/shop-service deployment/customer-service deployment/order-service \
  deployment/inventory-service deployment/wallet-service -n microservices
```

## 16. Service Map

Current default public routes:

| Route | Hostname | Backend service | Port |
| --- | --- | --- | --- |
| `api-route` | `api.haint.fyi` | `api-gateway` | `9000` |
| `keycloak-route` | `keycloak.haint.fyi` | `keycloak` | `8080` |
| `landing-fe-route` | `landing-fe.haint.fyi` | `landing-fe` | `3005` |
| `admin-fe-route` | `admin-fe.haint.fyi` | `admin-fe` | `3002` |
| `shop-fe-route` | `shop-fe.haint.fyi` | `shop-fe` | `3003` |
| `customer-fe-next-route` | `customer-fe-next.haint.fyi` | `customer-fe-next` | `3004` |
| `customer-wallet-fe-route` | `customer-wallet-fe.haint.fyi` | `customer-wallet-fe` | `3006` |
| `shop-wallet-fe-route` | `shop-wallet-fe.haint.fyi` | `shop-wallet-fe` | `3007` |
| `minio-route` | `minio.haint.fyi` | `minio` | `9000` |
| `kafka-ui-route` | `kafka-ui.haint.fyi` | `kafka-ui` | `8080` |
| `schema-registry-route` | `schema-registry.haint.fyi` | `schema-registry` | `8081` |

## 17. Upgrade

Pull the latest chart and deploy:

```bash
cd /root/spring-boot
git pull --ff-only
helm dependency build helm

helm upgrade --install microservices helm \
  --namespace microservices \
  --create-namespace \
  -f /root/helm-values/microservices-production.yaml
```

If you republished the same image tag, force fresh pods:

```bash
kubectl rollout restart -n microservices \
  deployment/api-gateway \
  deployment/product-service \
  deployment/order-service \
  deployment/inventory-service \
  deployment/notification-service \
  deployment/payment-service \
  deployment/wallet-service \
  deployment/shop-service \
  deployment/customer-service \
  deployment/landing-fe \
  deployment/admin-fe \
  deployment/shop-fe \
  deployment/customer-fe-next \
  deployment/customer-wallet-fe \
  deployment/shop-wallet-fe
```

## 18. Rollback

Show release history:

```bash
helm history microservices -n microservices
```

Rollback:

```bash
helm rollback microservices <revision> -n microservices
```

Check status:

```bash
helm status microservices -n microservices
kubectl get pods -n microservices
```

## 19. Backups

Back up the host paths and database dumps. At minimum:

```bash
sudo tar -czf /root/k8s-data-backup-$(date +%F).tgz /data
```

Postgres dump:

```bash
POSTGRES_POD=$(kubectl get pod -n microservices -l app=postgres -o jsonpath='{.items[0].metadata.name}')

kubectl exec -n microservices "$POSTGRES_POD" -- pg_dumpall -U postgres \
  > /root/postgres-dump-$(date +%F).sql
```

Keycloak MySQL dump:

```bash
MYSQL_POD=$(kubectl get pod -n microservices -l app=keycloak-mysql -o jsonpath='{.items[0].metadata.name}')

kubectl exec -n microservices "$MYSQL_POD" -- mysqldump -u root -p'CHANGE_ME_KEYCLOAK_MYSQL_ROOT_PASSWORD' --all-databases \
  > /root/keycloak-mysql-dump-$(date +%F).sql
```

Store backups outside the VPS.

## 20. Common Problems

Pods stay `Pending`:

```bash
kubectl describe pod <pod> -n microservices
kubectl get nodes --show-labels
```

Most common cause: the default `global.workloadScheduling.nodeSelector` points
to `kubernetes.io/hostname: k8s-worker`. Set it to `null` in the production
values file or label the intended worker node.

Gateway pods fail:

```bash
kubectl logs -n nginx-gateway -l app.kubernetes.io/name=nginx-gateway-fabric --tail=200
sudo ss -ltnp | grep -E ':80|:443'
```

Stop any host service or bundled ingress controller already using port `80` or
`443`.

Certificate stays pending:

```bash
kubectl get challenge,order,certificaterequest -n microservices
kubectl describe certificate haint-fyi-tls -n microservices
```

Check DNS, firewall port `80`, Gateway readiness, and cert-manager Gateway API
support.

Image pull fails:

```bash
kubectl describe pod <pod> -n microservices
```

Check the image tag, registry credentials, and CPU architecture. The VPS values
expect `linux/amd64` images.

Keycloak login callback fails:

- Confirm `AUTH_URL`, `AUTH_ISSUER`, and `AUTH_BASE_PATH` for the frontend.
- Confirm the realm import includes the exact callback URL.
- If changing domains, update the hardcoded redirect URIs in the Keycloak
  ConfigMap template.

Metrics Server conflicts:

- If K3s installed its own Metrics Server, either reinstall K3s with
  `--disable=metrics-server` or deploy this chart with
  `--set metricsServer.enabled=false`.

## 21. Useful Helm Commands

```bash
helm list -A
helm status microservices -n microservices
helm get values microservices -n microservices
helm get values microservices -n microservices --all
helm get manifest microservices -n microservices
helm template microservices helm --namespace microservices -f /root/helm-values/microservices-production.yaml
helm uninstall microservices -n microservices
```

Uninstalling the Helm release does not remove hostPath data in `/data`. Delete
that data only when you intentionally want to destroy the environment.
