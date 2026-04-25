# SwiftBatch Agent Brief

This document is the source of truth for the next coding session.

The goal is to build **SwiftBatch** as a recruiter-facing portfolio project that demonstrates:

- backend system design
- asynchronous job processing
- production-style deployment
- DevOps competence

The goal is **not** to build a broad product. Do not add features just because they are interesting.

## Hard Constraints

- Prioritize recruiter signal over product breadth.
- Prioritize low cost over managed-cloud convenience.
- Assume deployment will target a single Hostinger VPS first.
- Use the existing domain later for public demo endpoints.
- Do **not** introduce scope creep unless the current plan has a concrete technical flaw.
- If the plan needs to change, make the smallest change that unblocks delivery and document why.

## Project Positioning

SwiftBatch should look like a real backend platform, not a toy image resizer.

Core story:

- clients submit image-processing jobs
- jobs are queued and processed asynchronously
- workers generate transformed outputs
- results are stored and tracked
- the system exposes operational health and processing metrics

This should showcase:

- Go backend development
- queue-based architecture
- worker orchestration
- API design
- storage abstraction
- containerization
- Kubernetes deployment
- CI/CD
- observability

## Scope

### In Scope

- REST API for job creation and status retrieval
- S3-compatible object storage flow
- async queue with retries
- worker service with bounded concurrency
- image transforms:
  - resize
  - thumbnail generation
  - format conversion: `jpg`, `png`, `webp`, `avif`
  - compression quality presets
- persistent job metadata
- dead letter queue
- structured logging
- Prometheus metrics
- containerized deployment
- `k3s` deployment for a single VPS
- GitHub Actions CI/CD

### Explicitly Out of Scope

- user accounts
- recruiter sign-up flow
- polished frontend application
- watermarking in MVP
- billing
- multi-region deployment
- service mesh
- managed Kubernetes
- event bus replacement for Redis
- complex RBAC
- broad media support beyond images

## Demo Policy

The public demo should **not** require sign-up in MVP.

Use:

- anonymous access
- strict rate limits
- small upload size limits
- image-only MIME validation
- TTL-based cleanup for uploads and outputs
- EXIF stripping during processing

The recruiter experience should be:

1. upload or trigger a sample job
2. view job status
3. view generated outputs

Keep the demo simple and low-friction.

## Recommended Architecture

### Logical Components

- `api`: Go REST service
- `worker`: Go async processor
- `redis`: job queue and retry orchestration
- `postgres`: job metadata and audit trail
- `minio`: S3-compatible object storage
- `prometheus`: metrics collection
- `grafana`: operational dashboard
- `traefik`: ingress and TLS inside `k3s`

### Request Flow

1. client requests an upload target or uploads through the API flow
2. API validates the request and creates a job record in Postgres
3. API pushes the job to Redis
4. worker consumes the job
5. worker downloads source object from MinIO
6. worker generates requested variants
7. worker uploads results to MinIO
8. worker updates Postgres with status, outputs, and timing
9. client polls the job endpoint for status and result metadata

### Deployment Topology

Single VPS, single-node `k3s`:

- `swiftbatch-api`
- `swiftbatch-worker`
- `redis`
- `postgres`
- `minio`
- `prometheus`
- `grafana`
- `traefik`

This is enough to demonstrate real deployment competence without introducing cost-heavy infrastructure.

## API Surface

Keep the API intentionally small.

- `POST /v1/uploads/presign`
- `POST /v1/jobs`
- `GET /v1/jobs/:id`
- `GET /v1/jobs/:id/results`
- `POST /v1/jobs/:id/retry` for admin/internal use
- `GET /healthz`
- `GET /readyz`
- `GET /metrics`

If direct presigned upload complicates MVP too early, temporarily allow API-mediated upload only if that keeps the architecture moving. Document the tradeoff and return to presigned uploads after the core async pipeline works.

## Data Model

Minimum tables:

- `jobs`
  - `id`
  - `status`
  - `source_object_key`
  - `requested_transforms`
  - `output_format`
  - `failure_reason`
  - `created_at`
  - `updated_at`
- `job_attempts`
  - `id`
  - `job_id`
  - `attempt_number`
  - `status`
  - `started_at`
  - `finished_at`
  - `error_message`
- `job_outputs`
  - `id`
  - `job_id`
  - `variant_name`
  - `object_key`
  - `content_type`
  - `size_bytes`

Suggested lifecycle states:

- `queued`
- `processing`
- `completed`
- `failed`
- `dead_lettered`

## Engineering Decisions

### Language and Runtime

- Use Go for both API and worker.
- Prefer a small, clear codebase over framework-heavy abstractions.

### Queue

- Use Redis first.
- Support retries with bounded attempts.
- Move exhausted jobs to a DLQ.

### Storage

- Use MinIO in local/dev/prod-on-VPS environments.
- Keep storage access behind an abstraction that can later point to AWS S3 without redesign.

### Image Processing

- Use a performant image library suitable for production workloads.
- Favor reliable transforms over a large effect catalog.

### Observability

Expose metrics for:

- request count and latency
- job queue depth
- job completion/failure counts
- processing duration
- retry counts
- worker concurrency usage

Also include:

- structured logs
- correlation by job ID

## Delivery Order

Build in this order. Do not reorder unless blocked.

1. repository skeleton
2. local Docker Compose for API, worker, Redis, Postgres, MinIO
3. Postgres schema and migration flow
4. job creation API
5. Redis queue integration
6. worker consumption and status transitions
7. image transform pipeline
8. output storage and result retrieval
9. retries and DLQ
10. metrics and structured logging
11. Docker images
12. `k3s` manifests or Helm chart
13. GitHub Actions CI/CD
14. README, architecture diagram, demo instructions

## Repo Shape

Use a simple layout:

```text
swiftbatch/
  cmd/
    api/
    worker/
  internal/
    api/
    worker/
    queue/
    storage/
    db/
    imageproc/
    config/
    observability/
  migrations/
  deploy/
    docker/
    k8s/
  docs/
  scripts/
```

Do not split into microservices beyond API and worker.

## Definition of Done for MVP

MVP is done when all of the following are true:

- image job can be submitted
- job is processed asynchronously
- at least 3 output variants can be generated
- results are stored in MinIO
- job status can be queried
- retries work
- failed jobs can move to DLQ
- metrics are exposed
- app runs locally with Docker Compose
- app deploys to single-node `k3s`
- CI builds and deploys containers
- README explains local run, deployment, and demo flow

## Instructions for the Next Agent

Follow these rules exactly:

1. Treat this brief as the active contract.
2. Do not add features outside this document unless they are required to make the documented system work.
3. If you believe a change is necessary, prefer the smallest possible deviation.
4. Record any deviation in a short decision note inside `docs/` or the README.
5. Favor boring, reliable implementation choices.
6. Do not spend time on UI polish.
7. Do not introduce auth/signup unless the public demo becomes unsafe without minimal protection.
8. Do not replace Redis, Postgres, MinIO, or `k3s` without a concrete technical reason.
9. Optimize for a strong end-to-end demo over architectural novelty.
10. Keep the project understandable by a recruiter reviewing the repo in under 10 minutes.

## Anti-Scope-Creep Rule

If a possible addition does not materially improve one of these:

- backend depth
- operational credibility
- deployment quality
- demo clarity

then do not build it.

If unsure, leave it out.
