#!/usr/bin/env bash

set -euo pipefail

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "missing required env var: $name" >&2
    exit 1
  fi
}

image_name() {
  local image="$1"
  echo "${image%:*}"
}

image_tag() {
  local image="$1"
  echo "${image##*:}"
}

require_env GF_SECURITY_ADMIN_USER
require_env GF_SECURITY_ADMIN_PASSWORD
require_env MINIO_ROOT_USER
require_env MINIO_ROOT_PASSWORD
require_env SWIFTBATCH_POSTGRES_PASSWORD
require_env SWIFTBATCH_STORAGE_ACCESS_KEY
require_env SWIFTBATCH_STORAGE_SECRET_KEY
require_env SWIFTBATCH_API_IMAGE
require_env SWIFTBATCH_WORKER_IMAGE
require_env SWIFTBATCH_MIGRATE_IMAGE

namespace="swiftbatch"
kubeconfig="${SWIFTBATCH_KUBECONFIG:-/home/deploy/.kube/config}"
repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
tmpdir="$(mktemp -d)"
trap 'rm -rf "$tmpdir"' EXIT

mkdir -p "$tmpdir/k8s"
cp "$repo_root"/deploy/k8s/*.yaml "$tmpdir/k8s/"

cat >"$tmpdir/k8s/kustomization.yaml" <<EOF
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - traefik-config.yaml
  - config.yaml
  - storage.yaml
  - infrastructure.yaml
  - app.yaml
  - observability.yaml
  - ingress.yaml
images:
  - name: swiftbatch-api
    newName: $(image_name "$SWIFTBATCH_API_IMAGE")
    newTag: $(image_tag "$SWIFTBATCH_API_IMAGE")
  - name: swiftbatch-worker
    newName: $(image_name "$SWIFTBATCH_WORKER_IMAGE")
    newTag: $(image_tag "$SWIFTBATCH_WORKER_IMAGE")
  - name: swiftbatch-migrate
    newName: $(image_name "$SWIFTBATCH_MIGRATE_IMAGE")
    newTag: $(image_tag "$SWIFTBATCH_MIGRATE_IMAGE")
EOF

kubectl --kubeconfig "$kubeconfig" create namespace "$namespace" \
  --dry-run=client -o yaml | kubectl --kubeconfig "$kubeconfig" apply -f -

kubectl --kubeconfig "$kubeconfig" create secret generic swiftbatch-secrets \
  --namespace "$namespace" \
  --from-literal=GF_SECURITY_ADMIN_PASSWORD="$GF_SECURITY_ADMIN_PASSWORD" \
  --from-literal=GF_SECURITY_ADMIN_USER="$GF_SECURITY_ADMIN_USER" \
  --from-literal=MINIO_ROOT_PASSWORD="$MINIO_ROOT_PASSWORD" \
  --from-literal=MINIO_ROOT_USER="$MINIO_ROOT_USER" \
  --from-literal=POSTGRES_PASSWORD="$SWIFTBATCH_POSTGRES_PASSWORD" \
  --from-literal=SWIFTBATCH_POSTGRES_PASSWORD="$SWIFTBATCH_POSTGRES_PASSWORD" \
  --from-literal=SWIFTBATCH_STORAGE_ACCESS_KEY="$SWIFTBATCH_STORAGE_ACCESS_KEY" \
  --from-literal=SWIFTBATCH_STORAGE_SECRET_KEY="$SWIFTBATCH_STORAGE_SECRET_KEY" \
  --dry-run=client -o yaml | kubectl --kubeconfig "$kubeconfig" apply -f -

kubectl --kubeconfig "$kubeconfig" apply -k "$tmpdir/k8s"

kubectl --kubeconfig "$kubeconfig" rollout status deployment/swiftbatch-postgres -n "$namespace" --timeout=300s
kubectl --kubeconfig "$kubeconfig" rollout status deployment/swiftbatch-redis -n "$namespace" --timeout=300s
kubectl --kubeconfig "$kubeconfig" rollout status deployment/swiftbatch-minio -n "$namespace" --timeout=300s
kubectl --kubeconfig "$kubeconfig" rollout status deployment/swiftbatch-api -n "$namespace" --timeout=300s
kubectl --kubeconfig "$kubeconfig" rollout status deployment/swiftbatch-worker -n "$namespace" --timeout=300s
kubectl --kubeconfig "$kubeconfig" rollout status deployment/swiftbatch-prometheus -n "$namespace" --timeout=300s
kubectl --kubeconfig "$kubeconfig" rollout status deployment/swiftbatch-grafana -n "$namespace" --timeout=300s

kubectl --kubeconfig "$kubeconfig" get pods -n "$namespace"
