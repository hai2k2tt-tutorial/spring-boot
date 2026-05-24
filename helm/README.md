# Microservices Helm Install

For a VPS or existing Kubernetes cluster deployment, see [README.vps.md](./README.vps.md).
For automatic deployment from CI/CD, see [README.cicd.md](./README.cicd.md).

This repo should be deployed to `kind`, not Docker Desktop Kubernetes.

There are two Helm releases:

1. `ngf` in namespace `nginx-gateway`: NGINX Gateway Fabric controller
2. `microservices` in namespace `microservices`: app stack, infrastructure, Gateway, and HTTPRoute

## Prerequisites

- `kind`
- `kubectl`
- `helm`
- Docker running locally

## 1. Recreate the Kind cluster

If you previously deployed to Docker Desktop Kubernetes, switch away from that
context and use the `kind` cluster for this repo.

Create the cluster:

```bash
./helm/scripts/create-kind-cluster.sh
```

That config creates 3 nodes total: 1 `control-plane` and 2 `worker` nodes.
If the `microservices` kind cluster already exists, delete and recreate it so the
new node layout is applied:

```bash
kind delete cluster --name microservices
./helm/scripts/create-kind-cluster.sh
```

Use the cluster:

```bash
kubectl config use-context kind-microservices
```

The Kind config maps:

- `http://localhost:8080` -> Gateway NodePort `31437`
- `https://localhost:8443` -> Gateway NodePort `30478`

## 2. Install Gateway CRDs

Install both:

- Gateway API CRDs
- NGINX Gateway Fabric CRDs

```bash
./helm/scripts/install-gateway-api-crds.sh
```

Optional verification:

```bash
kubectl get crd gateways.gateway.networking.k8s.io
kubectl get crd nginxgateways.gateway.nginx.org
kubectl get crd nginxproxies.gateway.nginx.org
```

## 3. Install the gateway controller

Install NGINX Gateway Fabric as a separate Helm release:

```bash
helm install ngf oci://ghcr.io/nginx/charts/nginx-gateway-fabric \
  --namespace nginx-gateway \
  --create-namespace \
  -f helm/gateway-controller/values.yaml
```

Wait for the controller:

```bash
kubectl wait --timeout=5m -n nginx-gateway deployment/ngf-nginx-gateway-fabric --for=condition=Available
```

## 4. Install the microservices stack

```bash
helm dependency update helm
helm upgrade --install microservices helm \
  --namespace microservices \
  --create-namespace
```

Metrics Server is installed by the umbrella chart by default through the
`metricsServer.enabled` value. It uses Metrics Server `v0.8.1` and adds
`--kubelet-insecure-tls`, which is typically needed for local `kind` kubelet
certificates.

To disable it:

```bash
helm upgrade --install microservices helm \
  --namespace microservices \
  --create-namespace \
  --set metricsServer.enabled=false
```

## 5. Verify

```bash
kubectl top nodes
kubectl top pods -n microservices
kubectl get pods -n nginx-gateway
kubectl get pods -n microservices
kubectl get gatewayclass
kubectl get gateway,httproute -n microservices
```

## 6. Access services

Add local hostnames that point to `127.0.0.1`, for example:

```text
127.0.0.1 admin-fe.local
127.0.0.1 shop-fe.local
127.0.0.1 customer-fe-next.local
127.0.0.1 customer-fe-angular.local
127.0.0.1 api.local
127.0.0.1 keycloak.local
127.0.0.1 kafka-ui.local
127.0.0.1 grafana.local
127.0.0.1 tempo.local
127.0.0.1 prometheus.local
127.0.0.1 mailhog.local
127.0.0.1 schema-registry.local
127.0.0.1 loki.local
```

Then use the gateway on host port `8080` with those hostnames:

- `http://admin-fe.local:8080/`
- `http://shop-fe.local:8080/`
- `http://customer-fe-next.local:8080/`
- `http://customer-fe-angular.local:8080/`
- `http://api.local:8080/`
- `http://keycloak.local:8080/`
- `http://kafka-ui.local:8080/`
- `http://grafana.local:8080/`
- `http://tempo.local:8080/`
- `http://prometheus.local:8080/`
- `http://mailhog.local:8080/`
- `http://schema-registry.local:8080/`
- `http://loki.local:8080/`

## Layout

- `charts/infrastructure`: infrastructure subchart
- `charts/applications`: application subchart
- `charts/k8s-gateway`: Gateway and HTTPRoute
- `gateway-controller/values.yaml`: values for the separate NGF Helm release
