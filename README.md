# SwiftBatch

SwiftBatch is a recruiter-facing portfolio project that demonstrates a production-style Go backend for asynchronous image processing. The current repo includes the foundation for the first delivery milestones from `SWIFTBATCH_AGENT_BRIEF.md`:

- repository skeleton
- local Docker Compose stack
- Postgres schema and migration flow
- API and worker entrypoint scaffolding

## Repo Layout

```text
cmd/
  api/
  migrate/
  worker/
deploy/
  docker/
  k8s/
docs/
internal/
  api/
  config/
  db/
  imageproc/
  observability/
  platform/
  queue/
  storage/
  worker/
migrations/
scripts/
```

## Local Development

1. Copy `.env.example` to `.env` if you want local overrides.
2. Start the full local stack:

```bash
docker compose -f deploy/docker/docker-compose.yml up --build
```

The compose flow starts `postgres`, `redis`, `minio`, the bucket bootstrapper, migrations, the API, and the worker. The API is published on `http://localhost:18080`, and worker metrics are published on `http://localhost:18081/metrics`.

If you want to run the Go binaries outside Docker instead, start the infrastructure first and then run:

```bash
go run ./cmd/migrate up
go run ./cmd/api
go run ./cmd/worker
```

## Current Status

- `api` exposes `POST /v1/uploads/presign`, `POST /v1/jobs`, `GET /v1/jobs/:id`, `GET /v1/jobs/:id/results`, `GET /healthz`, `GET /readyz`, and `GET /metrics`
- `GET /` now serves a minimal browser UI for upload, job submission, status polling, retry, and output downloads
- `worker` now exposes Prometheus metrics on `http://localhost:18081/metrics` plus a simple `GET /healthz`
- new jobs are persisted in Postgres and enqueued into Redis
- uploads can now be pushed directly to MinIO using a presigned `PUT` URL returned by the API
- the worker downloads source objects from MinIO, runs image transforms, uploads generated outputs back to MinIO, and persists `job_outputs`
- the worker creates `job_attempts`, moves jobs through `queued`, `processing`, `completed`, `failed`, and `dead_lettered`, and automatically retries until `SWIFTBATCH_REDIS_MAX_RETRIES` is exhausted
- exhausted jobs are pushed to the Redis DLQ with failure metadata
- `GET /v1/jobs/:id/results` now returns output metadata plus presigned download URLs
- worker metrics now include queue depth, DLQ depth, job completion/failure counts, retry counts, processing duration, and concurrency usage
- structured JSON logs now include `job_id` on create, retry, processing, completion, and DLQ paths
- IP-based rate limiting now protects `POST /v1/uploads/presign`, `POST /v1/jobs`, and `POST /v1/jobs/:id/retry`
- Postgres migration flow is wired through `cmd/migrate`
- Docker Compose includes `api`, `worker`, `redis`, `postgres`, `minio`, and a one-shot `createbuckets` init container
- `deploy/k8s/` now contains single-node `k3s` manifests for the full demo stack, including Traefik ingresses plus Prometheus and Grafana
- the SkyServer deployment now uses Traefik with Let’s Encrypt HTTP-01, so the public hosts are served over valid HTTPS
- MinIO now sets explicit browser CORS for the frontend origin so presigned uploads work from the product UI

## Decision Notes

- the live SkyServer target now uses bundled `k3s` Traefik plus a `HelmChartConfig` override for Let’s Encrypt and HTTP-to-HTTPS redirection

Further reading:

- [Build Journal](/home/dell/dev/Carousell/SwiftBatch/docs/build-journal.md)
- [Backlog](/home/dell/dev/Carousell/SwiftBatch/docs/backlog.md)
- [CI/CD Setup](/home/dell/dev/Carousell/SwiftBatch/docs/ci-cd.md)
- [Deployment Strategy](/home/dell/dev/Carousell/SwiftBatch/docs/deployment-strategy.md)
- [Server Operations](/home/dell/dev/Carousell/SwiftBatch/docs/server-operations.md)

Implementation notes:

- the worker image uses Debian slim plus ImageMagick so `jpg`, `png`, `webp`, and `avif` output support is available with a small amount of code
- presigned URLs are generated against `SWIFTBATCH_STORAGE_PUBLIC_BASE_URL`, which defaults to `http://localhost:9000` for local Docker verification
- API rate limiting prefers `X-Forwarded-For`, then `X-Real-IP`, then `RemoteAddr`, so it still works sensibly behind Traefik
- the product is now being treated as an ephemeral-data demo system, so future cleanup of old uploads, outputs, and job history is part of the planned scope

Next implementation steps:

- add ephemeral data cleanup automation
- add demo-oriented docs and sample curl flow
- expand the user-facing frontend polish and add the engineering page

Deployment note:

- the current live-target plan uses a plain SkyServer Ubuntu VPS with `k3s`
- DNS for `abhinash.dev` is currently managed in the AWS Lightsail DNS zone UI, not Route 53
