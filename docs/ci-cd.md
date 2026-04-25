# CI/CD Setup

This document explains how the GitHub Actions scaffolding deploys SwiftBatch to the SkyServer VPS.

## Workflow Shape

The repo now contains two workflows:

- `.github/workflows/ci.yml`
  - runs on pull requests and non-`main` pushes
  - checks `gofmt`
  - runs `go test ./...`
- `.github/workflows/deploy.yml`
  - runs on pushes to `main`
  - can also be started manually with `workflow_dispatch`
  - builds and pushes app images to `GHCR`
  - uploads the repo contents to the VPS over SSH
  - runs `scripts/deploy-k8s.sh` on the server

## Deployment Model

The deployment workflow does not keep Kubernetes secrets in the repo.

Instead it:

- pushes immutable image tags to `GHCR`
- creates the `ghcr-pull-secret` pull secret on the cluster
- creates the `swiftbatch-secrets` Kubernetes secret from GitHub repository secrets
- applies the manifests
- waits for deployment rollouts

This is the intended replacement for the old committed-secret approach.

## Required GitHub Repository Variables

Set these in:

- `Settings -> Secrets and variables -> Actions -> Variables`

Required variables:

- `SWIFTBATCH_DEPLOY_HOST`
  - current value: `161.248.163.187`
- `SWIFTBATCH_DEPLOY_USER`
  - current value: `deploy`
- `SWIFTBATCH_DEPLOY_PORT`
  - current value: `22`

## Required GitHub Repository Secrets

Set these in:

- `Settings -> Secrets and variables -> Actions -> Secrets`

Required secrets:

- `SWIFTBATCH_DEPLOY_SSH_PRIVATE_KEY`
  - the private key that matches the server access path for `deploy`
- `GHCR_PULL_TOKEN`
  - token used by the cluster to pull private images from `ghcr.io`
  - it should have at least `read:packages`
- `GF_SECURITY_ADMIN_USER`
- `GF_SECURITY_ADMIN_PASSWORD`
- `MINIO_ROOT_USER`
- `MINIO_ROOT_PASSWORD`
- `SWIFTBATCH_POSTGRES_PASSWORD`
- `SWIFTBATCH_STORAGE_ACCESS_KEY`
- `SWIFTBATCH_STORAGE_SECRET_KEY`

## Notes On GHCR Credentials

The workflow pushes images to `GHCR` using GitHub Actions' built-in `GITHUB_TOKEN`.

The cluster pull secret is separate. That is why `GHCR_PULL_TOKEN` is still needed:

- Actions can push with `GITHUB_TOKEN`
- the running cluster needs its own read credential to pull images later

## Server-Side Deploy Entry Point

The server-side entry point is:

- [scripts/deploy-k8s.sh](/home/dell/dev/Carousell/SwiftBatch/scripts/deploy-k8s.sh)

That script expects the deployment environment variables to already be present. The GitHub Actions deploy workflow sets them before invoking the script remotely.

## First Deployment Checklist

Before expecting the deploy workflow to succeed, confirm:

1. DNS `A` records point at the VPS
2. `k3s` is healthy on the server
3. the `deploy` user can SSH in with the configured key
4. GitHub variables and secrets are configured
5. the repo is pushed to `main`

## Important Limitation

The workflows can build and deploy the repo, but they do not provision the server itself.

That means these still belong to manual infrastructure setup:

- Ubuntu server provisioning
- SSH hardening
- `k3s` installation
- DNS setup
