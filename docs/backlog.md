# SwiftBatch Backlog

This file tracks the remaining work for the MVP and the agreed delivery approach.

## Status

Completed:

- repository skeleton
- local Docker Compose stack
- Postgres schema and migrations
- job creation API
- Redis queue integration
- worker consumption and status transitions
- image transform pipeline
- output storage and result retrieval
- retries and DLQ
- metrics and structured logging
- Docker images
- single-node `k3s` manifests
- GitHub Actions CI/CD scaffolding

In progress next:

- first live CI/CD deployment run

Remaining after that:

- README finalization
- architecture diagram
- demo instructions
- ephemeral data cleanup automation

Footnote:

- the user-facing frontend has not been built yet
- for portfolio value, the eventual frontend should include a clean product flow plus a visible `Engineering` or `How It's Built` entry point that surfaces the system design without turning the homepage into a wall of infrastructure details

## Current Delivery Plan

The current deployment strategy is:

- use `GHCR` as the image registry
- build and push images from GitHub Actions
- deploy to a single Linux VPS running `k3s`
- keep the deployment provider-agnostic so it can move from one VPS vendor to another

The first realistic hosting plan is:

- initial deployment on the SkyServer VPS now that provisioning has completed
- keep the deployment flow portable so it can move later if the provider changes

## Migration Strategy

The agreed migration model is:

- no timed automatic cutover after a fixed date
- migration should be `switch-ready`, not blindly scheduled
- the system should be easy to redeploy on a new server
- DNS cutover should happen only after the replacement environment is healthy

This is safe because application data is intentionally treated as ephemeral for the MVP.

## Data Retention Direction

The current product assumption is:

- users are anonymous
- jobs are short-lived
- old uploads and outputs do not need long-term retention
- cross-provider migration does not require preserving old state

That means future cleanup work should explicitly delete:

- old uploaded source objects
- old generated outputs
- old jobs and job attempts
- old DLQ entries that are no longer useful for debugging

## Next Phase Scope: CI/CD

The CI/CD scaffolding now delivers:

- GitHub repo workflow for `go build` and basic validation
- Docker image build and push for:
  - `api`
  - `worker`
  - `migrate`
- deployment workflow that can target a server by secret/config, not by hardcoded provider assumptions
- deployment steps that are reusable for both:
  - temporary AWS server
  - later SkyServer server

What still remains operationally is:

- configure GitHub repository variables and secrets
- run the first deployment from GitHub Actions against the SkyServer VPS

## Non-Goals For The Next Phase

Do not do these unless they become necessary:

- timed migration after 4 months
- persistent multi-environment state promotion logic
- managed-cloud-specific deployment logic
- data-preserving migration tooling

## Open Inputs Needed From The User

Before the CI/CD phase can be completed end to end, the following are needed:

- GitHub repo created and pushed
- decision on `public` vs `private`
- chosen server provider for the first deployment target
- VPS access details
- DNS hostnames for:
  - API
  - MinIO object endpoint
  - MinIO console
  - Grafana
