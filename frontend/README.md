# Photon frontend

React + TypeScript + Tailwind. Single-page UI for the Photon async image pipeline.

## Build pipeline

`npm run build` writes hashed assets directly into `../internal/api/httpserver/static/`.
That directory is consumed by Go's `embed.FS` at compile time. Anything in
`internal/api/httpserver/static/` is generated — do not edit it by hand.

```
frontend/        ← edit here
  src/
internal/api/httpserver/static/   ← generated, embedded into the Go binary
```

## Develop

```
npm install
npm run dev          # http://localhost:5173, proxies API calls to :8080
```

Run the Go server alongside (`go run ./cmd/api`) and Vite proxies `/v1`,
`/healthz`, `/readyz` to it.

## Ship

```
npm run build
go build ./...
```

## Backend contract used

- `POST /v1/uploads/presign`
- `POST /v1/jobs`
- `GET  /v1/jobs/{id}`
- `GET  /v1/jobs/{id}/results`
- `POST /v1/jobs/{id}/retry`
- `GET  /readyz` (per-component reason on failure)

No backend changes. See `RECOMMENDATIONS.md` for endpoints that would let
the system stats become real instead of session-scoped.
