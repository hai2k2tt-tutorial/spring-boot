# Microservices Helm Install

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

## 5. Verify

```bash
kubectl get pods -n nginx-gateway
kubectl get pods -n microservices
kubectl get gatewayclass
kubectl get gateway,httproute -n microservices
```

## 6. Access services

- `http://localhost:8080/`
- `http://localhost:8080/keycloak`
- `http://localhost:8080/kafka-ui`
- `http://localhost:8080/grafana`
- `http://localhost:8080/prometheus`
- `http://localhost:8080/mailhog`

## Layout

- `charts/infrastructure`: infrastructure subchart
- `charts/applications`: application subchart
- `charts/k8s-gateway`: Gateway and HTTPRoute
- `gateway-controller/values.yaml`: values for the separate NGF Helm release
