# Agent Working Style

This document captures the expected engineering behavior for future agents working in this repo.

The goal is not just to "make changes." The goal is to make correct changes with clear reasoning, verification, and durable documentation.

## Core Principles

- understand the current system before editing it
- prefer simple architecture over extra moving parts
- keep changes aligned with the existing deployment model unless there is a strong reason to expand it
- test the real behavior, not just the happy-path assumption
- document decisions and failures while they are still fresh
- leave the repo easier to operate than it was before

## Expected Workflow

1. Read the relevant code and deployment path before making assumptions.
2. Identify the real integration surface.
3. Make the smallest change that solves the actual problem.
4. Verify the change at the right level:
   - unit or package tests when applicable
   - local runtime checks when behavior is user-facing
   - deployment checks when infrastructure changed
5. Update documentation and the engineering journal when the change affects architecture, operations, or lessons learned.

## Frontend Rule

If a task affects browser behavior, do not use production deployment as the first meaningful test.

Before pushing:

- run the relevant local stack if possible
- verify the UI path in a browser or equivalent local check
- verify cross-origin behavior when the browser talks to a different host, such as MinIO presigned upload flows

CI/CD is a deployment verification step, not the first place to discover obvious frontend breakage.

For redesign-specific guardrails, also read:

- `docs/frontend-iteration-guidelines.md`

## Verification Rule

Verification should match the type of change.

- backend handler change: run tests and exercise the endpoint
- infrastructure change: render or validate manifests and check rollout behavior
- browser workflow change: test the real upload / submit / poll / results path
- security or auth change: verify both the success path and the failure mode

If a local toolchain is unavailable, say that explicitly and use the next best reliable verification path.

## Documentation Rule

Update docs when any of these change:

- deployment flow
- public URLs
- required secrets or config
- operational behavior
- architecture decisions
- debugging lessons that are likely to repeat

At minimum, consider:

- `README.md`
- `docs/build-journal.md`
- `docs/backlog.md`
- deployment-specific docs under `docs/` or `deploy/`

## Communication Style

Future agents should communicate like a pragmatic senior engineer:

- concise
- direct
- explicit about tradeoffs
- explicit about what is verified versus inferred
- clear when something failed, why it failed, and how it was corrected

Avoid:

- fluff
- vague reassurance
- hiding uncertainty
- treating "seems fine" as verification

## Repository-Specific Notes

- the current frontend is a minimal UI served directly by the Go API, not a separate frontend app
- the current frontend source now lives in `frontend/` and builds into `internal/api/httpserver/static/`
- the deployment target is a single-node `k3s` cluster on the SkyServer VPS
- public DNS for `abhinash.dev` is managed in the AWS Lightsail DNS UI
- GitHub Actions deploys to the server on qualifying pushes to `main`
- MinIO browser uploads depend on correct CORS behavior for the frontend origin

## Standard Of Done

A task is not done when code has been written.

A task is done when:

- the code is in place
- the relevant behavior is verified
- the failure cases are understood well enough
- the documentation reflects the new reality
- the working tree is clean
