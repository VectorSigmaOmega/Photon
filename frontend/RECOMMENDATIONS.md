# Backend recommendations (not implemented)

The frontend honours the existing API contract and labels the unsupported tiles
explicitly. To make the second stats row real instead of dashed-out, three
narrowly-scoped endpoints would suffice:

## 1. `GET /v1/system/queue`

```jsonc
{
  "queue_depth": 12,        // Redis LLEN of the job queue
  "dlq_depth": 0,           // Redis LLEN of the dead-letter queue
  "checked_at": "2026-..."
}
```

Cheap: two `LLEN` calls. Lets the "queue depth" and "dlq size" tiles go live.

## 2. `GET /v1/system/runtime`

```jsonc
{
  "worker_replicas": 4,     // pulled from k8s API or static config
  "build_sha": "...",
  "image_tag": "...",
  "started_at": "..."
}
```

Replaces the "worker count" tile and adds an honest build identifier.

## 3. `GET /v1/system/latency` (or proxy a Prometheus counter)

```jsonc
{
  "p50_ms": 1230,
  "p95_ms": 4120,
  "window_seconds": 300
}
```

Either a small handler that queries the Prometheus histogram, or a CORS-allowed
`/metrics` proxy scoped to the two relevant series. Replaces the "p95 latency"
tile.

## Optional polish

- A single SSE/WebSocket endpoint pushing job state transitions would let the
  frontend drop polling. Current 1.5s polling is fine for a demo but obvious
  on the wire.
- A `from`/`to` filter on `GET /v1/jobs` (currently single-id only) would let
  the page show recent jobs from prior sessions without local persistence.

None of these are necessary for the current page to be honest — the dashed
tiles already communicate what is and isn't real.
