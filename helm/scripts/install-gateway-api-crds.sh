#!/usr/bin/env bash

set -euo pipefail

kubectl kustomize "https://github.com/nginx/nginx-gateway-fabric/config/crd/gateway-api/standard?ref=v2.6.0" | kubectl apply -f -
kubectl apply --server-side -f "https://raw.githubusercontent.com/nginx/nginx-gateway-fabric/v2.6.0/deploy/crds.yaml"
