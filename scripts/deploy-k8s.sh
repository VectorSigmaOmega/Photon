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
require_env PHOTON_POSTGRES_PASSWORD
require_env PHOTON_STORAGE_ACCESS_KEY
require_env PHOTON_STORAGE_SECRET_KEY
require_env PHOTON_API_IMAGE
require_env PHOTON_WORKER_IMAGE
require_env PHOTON_MIGRATE_IMAGE
require_env PHOTON_CLEANUP_IMAGE

namespace="photon"
kubeconfig="${PHOTON_KUBECONFIG:-/home/deploy/.kube/config}"
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
  - name: photon-api
    newName: $(image_name "$PHOTON_API_IMAGE")
    newTag: $(image_tag "$PHOTON_API_IMAGE")
  - name: photon-worker
    newName: $(image_name "$PHOTON_WORKER_IMAGE")
    newTag: $(image_tag "$PHOTON_WORKER_IMAGE")
  - name: photon-migrate
    newName: $(image_name "$PHOTON_MIGRATE_IMAGE")
    newTag: $(image_tag "$PHOTON_MIGRATE_IMAGE")
  - name: photon-cleanup
    newName: $(image_name "$PHOTON_CLEANUP_IMAGE")
    newTag: $(image_tag "$PHOTON_CLEANUP_IMAGE")
EOF

kubectl --kubeconfig "$kubeconfig" create namespace "$namespace" \
  --dry-run=client -o yaml | kubectl --kubeconfig "$kubeconfig" apply -f -

kubectl --kubeconfig "$kubeconfig" create secret generic photon-secrets \
  --namespace "$namespace" \
  --from-literal=GF_SECURITY_ADMIN_PASSWORD="$GF_SECURITY_ADMIN_PASSWORD" \
  --from-literal=GF_SECURITY_ADMIN_USER="$GF_SECURITY_ADMIN_USER" \
  --from-literal=MINIO_ROOT_PASSWORD="$MINIO_ROOT_PASSWORD" \
  --from-literal=MINIO_ROOT_USER="$MINIO_ROOT_USER" \
  --from-literal=POSTGRES_PASSWORD="$PHOTON_POSTGRES_PASSWORD" \
  --from-literal=PHOTON_POSTGRES_PASSWORD="$PHOTON_POSTGRES_PASSWORD" \
  --from-literal=PHOTON_STORAGE_ACCESS_KEY="$PHOTON_STORAGE_ACCESS_KEY" \
  --from-literal=PHOTON_STORAGE_SECRET_KEY="$PHOTON_STORAGE_SECRET_KEY" \
  --dry-run=client -o yaml | kubectl --kubeconfig "$kubeconfig" apply -f -

kubectl --kubeconfig "$kubeconfig" apply -k "$tmpdir/k8s"

kubectl --kubeconfig "$kubeconfig" rollout status deployment/photon-postgres -n "$namespace" --timeout=300s
kubectl --kubeconfig "$kubeconfig" rollout status deployment/photon-redis -n "$namespace" --timeout=300s
kubectl --kubeconfig "$kubeconfig" rollout status deployment/photon-minio -n "$namespace" --timeout=300s
kubectl --kubeconfig "$kubeconfig" rollout status deployment/photon-api -n "$namespace" --timeout=300s
kubectl --kubeconfig "$kubeconfig" rollout status deployment/photon-worker -n "$namespace" --timeout=300s
kubectl --kubeconfig "$kubeconfig" rollout status deployment/photon-cleanup -n "$namespace" --timeout=300s
kubectl --kubeconfig "$kubeconfig" rollout status deployment/photon-prometheus -n "$namespace" --timeout=300s
kubectl --kubeconfig "$kubeconfig" rollout status deployment/photon-grafana -n "$namespace" --timeout=300s

kubectl --kubeconfig "$kubeconfig" get pods -n "$namespace"
