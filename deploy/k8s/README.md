# Kubernetes Manifests

These manifests target a single-node `k3s` cluster and deploy the full SwiftBatch demo stack:

- `swiftbatch-api`
- `swiftbatch-worker`
- `postgres`
- `redis`
- `minio`
- `prometheus`
- `grafana`
- Traefik `Ingress` resources for the API, MinIO object endpoint, MinIO console, and Grafana

The manifests assume the default `local-path` storage class that ships with `k3s`.

## Image Strategy

The app manifests reference stable image names:

- `swiftbatch-api:latest`
- `swiftbatch-worker:latest`
- `swiftbatch-migrate:latest`

The intended deployment path is not "apply the repo as-is with committed secrets." Instead:

- `scripts/deploy-k8s.sh` generates a temporary kustomization
- that kustomization rewrites the three app images to registry-backed immutable tags
- the script creates Kubernetes secrets from runtime environment variables
- then the script applies the manifests and waits for rollout

This keeps sensitive values out of the repo while preserving simple base YAML.

You can still use the manifests manually if you want, but then you must:

1. create `swiftbatch-secrets` yourself
2. replace the app image names with real registry tags before applying

If you prefer building directly on the cluster host, you can still:

Example import flow on a host that has both Docker and `k3s`:

```bash
docker build -t swiftbatch-api:latest -f deploy/docker/Dockerfile.api .
docker build -t swiftbatch-worker:latest -f deploy/docker/Dockerfile.worker .
docker build -t swiftbatch-migrate:latest -f deploy/docker/Dockerfile.migrate .

docker save swiftbatch-api:latest | sudo k3s ctr images import -
docker save swiftbatch-worker:latest | sudo k3s ctr images import -
docker save swiftbatch-migrate:latest | sudo k3s ctr images import -
```

## Before Apply

Edit these files first:

- [config.yaml](/home/dell/dev/Carousell/SwiftBatch/deploy/k8s/config.yaml)
- [ingress.yaml](/home/dell/dev/Carousell/SwiftBatch/deploy/k8s/ingress.yaml)

The repo is currently prewired for these hosts:

- `swiftbatch.abhinash.dev`
- `storage.swiftbatch.abhinash.dev`
- `minio.swiftbatch.abhinash.dev`
- `grafana.swiftbatch.abhinash.dev`

If those change later, update both [config.yaml](/home/dell/dev/Carousell/SwiftBatch/deploy/k8s/config.yaml) and [ingress.yaml](/home/dell/dev/Carousell/SwiftBatch/deploy/k8s/ingress.yaml). Keep `SWIFTBATCH_STORAGE_PUBLIC_BASE_URL` aligned with the MinIO object ingress host.

## Deploy

Recommended:

```bash
export GF_SECURITY_ADMIN_USER=...
export GF_SECURITY_ADMIN_PASSWORD=...
export MINIO_ROOT_USER=...
export MINIO_ROOT_PASSWORD=...
export SWIFTBATCH_POSTGRES_PASSWORD=...
export SWIFTBATCH_STORAGE_ACCESS_KEY=...
export SWIFTBATCH_STORAGE_SECRET_KEY=...
export SWIFTBATCH_API_IMAGE=ghcr.io/vectorsigmaomega/swiftbatch-api:<tag>
export SWIFTBATCH_WORKER_IMAGE=ghcr.io/vectorsigmaomega/swiftbatch-worker:<tag>
export SWIFTBATCH_MIGRATE_IMAGE=ghcr.io/vectorsigmaomega/swiftbatch-migrate:<tag>

./scripts/deploy-k8s.sh
```

Manual fallback:

```bash
kubectl apply -k deploy/k8s
kubectl -n swiftbatch get pods
```

The API pod runs the migration binary as an init container before the main server starts. The worker waits for the schema and MinIO bucket before it starts processing.
The API root path serves the minimal browser frontend, and the MinIO deployment applies global CORS for `MINIO_API_CORS_ALLOW_ORIGIN` so browser-based presigned uploads work.

Because the published GHCR images are currently public, the cluster does not need an image pull secret. If those packages are made private later, reintroduce a pull secret at that time.

## Access

- API: `https://swiftbatch.abhinash.dev`
- MinIO object endpoint for presigned URLs: `https://storage.swiftbatch.abhinash.dev`
- MinIO console: `https://minio.swiftbatch.abhinash.dev`
- Grafana: `https://grafana.swiftbatch.abhinash.dev`
- Prometheus: `kubectl -n swiftbatch port-forward svc/swiftbatch-prometheus 9090:9090`

## TLS Note

The repo now includes [traefik-config.yaml](/home/dell/dev/Carousell/SwiftBatch/deploy/k8s/traefik-config.yaml), which adds a `HelmChartConfig` for the bundled `k3s` Traefik install:

- persistent ACME storage at `/data/acme.json`
- Let's Encrypt HTTP-01 certificate issuance
- HTTP-to-HTTPS redirection on the `web` entrypoint

The ingress resources are configured for the `websecure` entrypoint and reference the `letsencrypt` certificate resolver.
