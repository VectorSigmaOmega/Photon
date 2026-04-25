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

The app manifests reference local image names:

- `swiftbatch-api:latest`
- `swiftbatch-worker:latest`
- `swiftbatch-migrate:latest`

That keeps the YAML simple for the MVP. You can either:

1. build the images on the same Linux host that runs `k3s` and import them into `containerd`, or
2. replace those image fields with registry-backed tags before applying

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

```bash
kubectl apply -k deploy/k8s
kubectl -n swiftbatch get pods
```

The API pod runs the migration binary as an init container before the main server starts. The worker waits for the schema and MinIO bucket before it starts processing.

## Access

- API: `http://swiftbatch.abhinash.dev`
- MinIO object endpoint for presigned URLs: `http://storage.swiftbatch.abhinash.dev`
- MinIO console: `http://minio.swiftbatch.abhinash.dev`
- Grafana: `http://grafana.swiftbatch.abhinash.dev`
- Prometheus: `kubectl -n swiftbatch port-forward svc/swiftbatch-prometheus 9090:9090`

## Decision Note

The ingress manifests are HTTP-first. TLS termination is intentionally left out of these repo manifests because certificate provisioning is environment-specific on `k3s` and depends on how Traefik is configured on the target VPS. Once the domain is attached on the target server, switch the hosts to HTTPS and add Traefik/certificate resources that fit the cluster.
