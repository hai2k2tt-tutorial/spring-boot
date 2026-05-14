#!/usr/bin/env bash

set -euo pipefail

METRICS_SERVER_VERSION="v0.8.1"

kubectl apply -f "https://github.com/kubernetes-sigs/metrics-server/releases/download/${METRICS_SERVER_VERSION}/components.yaml"

if ! kubectl get deployment metrics-server -n kube-system -o jsonpath='{.spec.template.spec.containers[0].args}' | grep -q -- '--kubelet-insecure-tls'; then
  kubectl patch deployment metrics-server \
    -n kube-system \
    --type=json \
    -p='[
      {"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}
    ]'
fi

kubectl rollout status deployment/metrics-server -n kube-system --timeout=3m
