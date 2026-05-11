#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

kubectl apply -k "${SCRIPT_DIR}/../gateway-api-crds"
kubectl apply --server-side -f "https://raw.githubusercontent.com/nginx/nginx-gateway-fabric/v2.6.0/deploy/crds.yaml"

helm upgrade --install ngf oci://ghcr.io/nginx/charts/nginx-gateway-fabric \
  --namespace nginx-gateway \
  --create-namespace \
  --values "${SCRIPT_DIR}/values.yaml" \
  --wait
