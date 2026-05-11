# Microservices Helm Chart

Install from the umbrella chart at `helm/`.

## Install

```bash
helm dependency update helm
helm install microservices helm --namespace microservices --create-namespace
```

## Upgrade

```bash
helm upgrade microservices helm --namespace microservices
```

## Layout

- `charts/infrastructure`: infrastructure subchart
- `charts/applications`: applications subchart
- `charts/applications/charts/*`: nested per-service application charts
