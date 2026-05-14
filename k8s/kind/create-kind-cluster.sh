#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLUSTER_NAME="microservices"
CONFIG_FILE="${SCRIPT_DIR}/kind-config.yaml"

echo "Creating kind cluster '${CLUSTER_NAME}' with 1 control-plane and 2 worker nodes"
kind create cluster --name "${CLUSTER_NAME}" --config "${CONFIG_FILE}"
