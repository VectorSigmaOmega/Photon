# Frontend Iteration Guidelines

This document exists because the Photon redesign introduced real runtime bugs even though the visual work was strong.

The lesson is simple:

- frontend redesign is not just styling work
- it is integration work
- integration work must be treated like systems work

Use this checklist whenever the UI is being redesigned, replatformed, or substantially refactored.

## Main Rule

Do not treat "new design" and "same behavior" as automatic.

Any redesign that changes:

- state management
- async flow
- polling
- file upload wiring
- generated assets
- routing

must be treated as a functional change, not just a presentation change.

## What Went Wrong This Time

These were the concrete failure modes in the React redesign:

1. The backend completed jobs, but the frontend never started polling reliably.
2. Polling logic depended on a race-prone React state snapshot after job creation.
3. Ref-based and state-based truth diverged.
4. Rebuilding frontend and Docker in parallel caused the API image to embed stale static assets.
5. Browser verification happened after the visual redesign was already far along, which made debugging slower.

These are exactly the kinds of issues this checklist is meant to prevent.

## Required Workflow For Any Frontend Redesign

1. Confirm the live backend contract first.
2. Preserve the existing user flow before adding visual ambition.
3. Add design layers after the basic flow still works.
4. Verify in a real browser before any push.
5. Rebuild generated assets before rebuilding the backend image.

## Contract Discipline

Before editing the UI, write down the actual contract being used:

- `POST /v1/uploads/presign`
- `POST /v1/jobs`
- `GET /v1/jobs/{id}`
- `GET /v1/jobs/{id}/results`
- `POST /v1/jobs/{id}/retry`
- `GET /readyz`

Also record:

- which fields are required
- which fields drive the UI state machine
- which statuses are terminal
- which statuses require polling

Do not design the async flow from memory.
Read the handlers and current request payloads first.

## State Management Rules

For async pipelines, there must be one clear source of truth.

Prefer:

- one canonical job state per item
- one canonical poll scheduler
- one clear mapping from backend status to UI status

Avoid:

- mixing React state and mutable refs unless the ownership is explicit
- starting timers from stale closures
- deciding whether to poll based on "whatever state has probably settled by now"
- multiple overlapping poll loops

If refs are used for async coordination, keep them synchronized deliberately and immediately.

## Polling Rules

Polling must be designed like backend scheduling, not like a visual effect.

Checklist:

- define which statuses are pollable
- define which statuses are terminal
- ensure only one poll scheduler is active per page state
- stop polling when there are no pollable jobs
- avoid creating a new timer every render or every state update
- check request volume, not just visible status transitions

If a single job causes dozens of `GET /v1/jobs/:id` calls in a few seconds, the polling design is wrong even if the UI eventually works.

## File Upload Rules

If the UI wraps a native file input:

- verify that the real `<input type="file">` still exists
- verify `multiple` if multi-file upload is intended
- verify accepted mime types
- verify staged files appear in the UI
- verify presign request
- verify direct upload to object storage
- verify job creation after upload

Do not assume a beautiful dropzone still wires to the real browser file input correctly.

## Build And Embed Rules

Photon does not serve the React app directly from Vite in production.

The actual chain is:

1. edit `frontend/src/*`
2. run `npm run build`
3. generated assets are written into `internal/api/httpserver/static/`
4. Go embeds that directory into the API binary
5. Docker rebuilds the API image

That means:

- never edit `internal/api/httpserver/static/` by hand
- never rebuild the API container before the frontend build is complete
- never run frontend build and Docker rebuild in parallel if you need deterministic verification

Correct order:

1. `cd frontend && npm run build`
2. `cd .. && docker compose -f deploy/docker/docker-compose.yml up -d --build api`
3. verify the served bundle hash if needed

## Verification Rules

For a frontend redesign, "page loads" is not enough.

Minimum verification:

1. open the page in a browser
2. stage a real file
3. submit a real job
4. verify:
   - presign request
   - object upload
   - job creation
   - job polling
   - terminal status transition
   - results fetch
   - download links appearing

Also inspect:

- browser console
- network requests
- backend logs

If the worker completes but the UI stays queued, this is a frontend bug even if the backend is healthy.

## Design Scope Control

When redesigning, separate these phases:

### Phase 1: behavior parity

- same flow
- same endpoints
- same states
- same results

### Phase 2: visual ambition

- hierarchy
- typography
- motion
- diagrams
- polish

### Phase 3: optional enhancements

- richer stats
- extra system storytelling
- engineering surfaces

Do not attempt all three phases at once unless the existing flow is already locked down and verified.

## When To Slow Down

Pause and verify immediately if any of these happen:

- UI shows `queued` for too long but backend logs show completion
- no polling requests appear
- too many polling requests appear
- generated assets changed but the served bundle hash did not
- local Docker and the local filesystem disagree about which frontend build is live
- network flow succeeds but DOM state does not update

These are signals of integration drift, not cosmetic bugs.

## Recommended Pre-Push Checklist

- `npm run build`
- local app stack rebuilt after frontend build
- real browser smoke test completed
- network request sequence inspected
- console checked
- backend logs checked
- generated asset path confirmed
- no stale assumptions about backend status values

## Final Rule

If a redesign changes the visible architecture story, it must not weaken the real product flow.

For this repo, the priority order is:

1. upload and completion work
2. pipeline status is truthful
3. results and downloads appear
4. then the design earns the right to be bold
