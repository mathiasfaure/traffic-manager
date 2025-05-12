#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CRD_FILE="$SCRIPT_DIR/apigateway-crd.yaml"

if ! command -v kubectl &> /dev/null; then
  echo "kubectl not found. Please install kubectl and configure your kubeconfig."
  exit 1
fi

kubectl apply -f "$CRD_FILE"
echo "Applied $CRD_FILE to the current Kubernetes context." 