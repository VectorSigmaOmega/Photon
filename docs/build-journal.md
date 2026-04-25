# SwiftBatch Build Journal

This document is a reconstructed engineering journal for the SwiftBatch build-out. It is intended for a junior developer who wants to understand not just what was built, but why certain choices were made and how problems were debugged.

It is not a verbatim terminal transcript. The original session was long and part of it was compacted, so this journal is based on the retained work summary, the current repo state, and the implementation decisions captured in the code.

## 1. Starting Point

The project did not begin as a working application. It began with a brief: [SWIFTBATCH_AGENT_BRIEF.md](/home/dell/dev/Carousell/SwiftBatch/SWIFTBATCH_AGENT_BRIEF.md).

That brief mattered because it set the real constraints:

- this is a recruiter-facing backend project, not a consumer product
- the goal is strong engineering signal, not feature count
- the stack should be inexpensive and practical
- deployment should target a single VPS running `k3s`

That meant the right question was never "what is the most advanced design?" The right question was "what is the smallest credible system that proves backend, infra, and operational competence?"

## 2. The Core Design Decisions

### Why Go for both API and worker

The brief explicitly wanted Go. That made sense because:

- one language keeps the repo easier to understand
- Go is strong for servers, workers, and concurrency
- it is a good recruiter signal for backend work

The codebase was kept small and explicit rather than framework-heavy.

### Why Redis, Postgres, and MinIO

These were chosen because each one solves a specific problem cleanly:

- `Redis` is the queue and retry mechanism
- `Postgres` stores durable job state and audit trail
- `MinIO` stores uploaded source files and generated outputs

This separation is important. A queue is good at moving work around. A database is good at keeping history and status. Object storage is good at holding files. Mixing those concerns usually makes systems harder to reason about.

### Why a simple API plus a worker

The system was intentionally split into:

- an `API` that accepts jobs and reports status
- a `worker` that does the slow image processing asynchronously

This is one of the main architectural stories of the project. If image processing happened directly inside the request handler, the system would be less realistic and less operationally sound.

### Why plain Kubernetes manifests instead of Helm

Later in the build, the `k3s` deployment phase used plain manifests rather than Helm.

That was a deliberate choice:

- only one deployment shape exists right now
- the repo is still small
- raw YAML is easier for a recruiter to inspect
- Helm would add abstraction and template overhead before it actually pays for itself

For this project stage, simple manifests were the more honest solution.

### Why deployment is being designed to be provider-agnostic

Later planning added one more important operational decision:

- the deployment pipeline should not be tightly coupled to one VPS vendor

The likely path is to start on one provider and possibly move later to another based on cost. That is easier if the repo assumes:

- images live in `GHCR`
- deployment targets are just Linux servers running `k3s`
- CI/CD deploys to a server target, not to a brand-specific platform integration

That makes future migration a deployment concern, not an application rewrite.

## 3. The Build Sequence

The work followed the order in the brief as closely as possible.

### Phase 1: Repository and local runtime

The first step was building the repo skeleton and getting a local Docker Compose environment working.

This created:

- API container
- worker container
- Postgres
- Redis
- MinIO
- migration flow
- bucket bootstrap step

This matters more than it sounds. Early on, the real goal is not "write features fast." The real goal is "get a repeatable environment." Without that, every later problem becomes harder to trust and harder to debug.

### Phase 2: Database schema and migration flow

The schema was kept very close to the brief:

- `jobs`
- `job_attempts`
- `job_outputs`

This was the right choice because the brief already described the domain clearly. Inventing a more complex schema would have added noise, not value.

### Phase 3: Job creation API

The API gained:

- `POST /v1/jobs`
- `GET /v1/jobs/:id`
- `GET /v1/jobs/:id/results`
- health and metrics endpoints

At this stage, the system could accept jobs and persist them, but the worker was not yet doing real processing.

### Phase 4: Queue integration and worker status transitions

The worker was then upgraded to:

- dequeue from Redis
- claim work transactionally in Postgres
- create `job_attempts`
- move jobs through `queued -> processing -> completed`

The key idea here was that queue state alone is not enough. Redis says "some work exists," but Postgres must remain the source of truth for job state.

### Phase 5: Real image processing

The worker moved from a stub to a real pipeline:

1. download source object from MinIO
2. process the image
3. upload generated outputs
4. persist output metadata in Postgres

Image processing used ImageMagick inside the worker container. This was pragmatic:

- it supports `jpg`, `png`, `webp`, and `avif`
- it reduces the amount of custom image code we had to write
- it is easy to verify in a container

### Phase 6: Retries and dead-letter queue

The worker was extended to:

- retry failed jobs up to a configured limit
- requeue transient failures
- move exhausted failures to a DLQ

This made the system much more production-shaped. Real systems need failure paths that are visible and bounded.

### Phase 7: Presigned upload and download flow

The API later added:

- `POST /v1/uploads/presign`

This allowed clients to upload directly to MinIO using presigned URLs instead of pushing file bytes through the API itself.

This is a common backend pattern because it keeps the API smaller and avoids wasting application server resources on bulk file transfer.

### Phase 8: Observability

The observability phase added:

- API request count and latency metrics
- worker queue depth, DLQ depth, retry counts, job outcome counts
- worker processing duration histograms
- worker concurrency gauges
- structured logs with `job_id`

This phase was important because the brief explicitly cared about operational credibility, not just "it works on my machine."

### Phase 9: `k3s` deployment manifests

The project then gained single-node `k3s` manifests for:

- app services
- stateful dependencies
- ingress
- Prometheus
- Grafana

At that point, the project stopped being just a local demo and became something that could plausibly be deployed to a VPS.

### Phase 10: Deployment planning and ephemeral data policy

After the infrastructure manifests were in place, the deployment strategy was refined:

- application data is treated as ephemeral for the MVP
- old jobs and files are expected to be cleaned up regularly
- future provider migration does not need data preservation
- migration should be done as a manual cutover once the replacement target is healthy

This changed the deployment outlook in a useful way. Moving between providers became much cheaper operationally because the stack can be redeployed without preserving historic user data.

## 4. Important Design Choices, Explained Simply

### Why job status lives in Postgres, not just Redis

Redis is fast and good for queues, but it is not where you want your long-term job history to live.

Postgres gives you:

- durable state
- queryable history
- audit trail of attempts
- output metadata

If a worker crashes, Postgres still tells you what happened.

### Why the worker claims jobs transactionally

Imagine two workers pull the same job at nearly the same time. Without careful handling, they could both process it.

That is why the worker claims the job through the database and checks whether it is still in a claimable state. This is a common pattern to avoid duplicate work.

### Why output metadata is separate from the job row

One job can produce multiple outputs. That means outputs should not be shoved into a single field on the `jobs` table.

Using a separate `job_outputs` table made it easy to store:

- output variant name
- object key
- content type
- size

That is both more normalized and easier to query cleanly.

### Why worker metrics are on a separate endpoint

The worker is not an HTTP API service, but Prometheus still needs a place to scrape metrics from.

So the worker exposes a small metrics server on a different port. This is a very common pattern for background services.

### Why MinIO also needs ingress in Kubernetes

This is a subtle but important point.

Presigned URLs point clients directly at object storage. That means the MinIO object endpoint must be reachable by the client, not just by the API inside the cluster.

That is why the Kubernetes ingress set includes:

- one host for the API
- one host for the MinIO object endpoint
- one host for the MinIO console

Without that, presigned upload and download would break in a real deployment.

## 5. Problems That Came Up and How They Were Fixed

This section is the most useful part for junior engineers. Most real engineering work is not typing the final code. It is detecting what is actually wrong.

### Problem 1: Docker environment interruptions

The environment was not perfectly smooth from the start.

Relevant issues included:

- Docker Desktop availability was inconsistent at first
- Docker consumed too much memory and the machine had to be rebooted
- the session had to resume after interruption

What mattered here was not "avoid all interruptions." What mattered was making the work resumable:

- keep the repo state consistent
- verify features end to end after each phase
- update the README as milestones land

This is a good habit. Long-running work gets interrupted in real life.

### Problem 2: The worker initially did not do real processing

Early on, the worker only handled queue consumption and status changes. It did not yet generate files.

This was fixed by adding the real processing path:

- download from MinIO
- process with ImageMagick
- upload outputs
- write `job_outputs`

This is a good example of staged delivery. It is often better to prove the queue and state model first, then attach the expensive processing logic.

### Problem 3: A grayscale test job failed and looked like a pipeline bug

A job using a grayscale PNG failed and ended up in the DLQ. At first glance, this could have looked like "grayscale images are broken."

That would have been the wrong conclusion.

The actual issue was that the specific PNG sample was corrupt.

How it was debugged:

- the failing sample was tested directly
- `pngcheck` reported an `IDAT` CRC error
- ImageMagick `convert` also failed on that file
- a valid grayscale control image was generated and processed successfully

Lesson:

- do not stop at the first plausible explanation
- isolate whether the problem is the code path or the input data

This is one of the cleaner examples in the project of hypothesis testing done correctly.

### Problem 4: Presigned upload URL generation returned API 500

When presigned uploads were first added, the API returned an internal server error.

The root cause was subtle:

- the API used MinIO for internal communication via the cluster/container hostname
- the presigned URL used a public host like `localhost:9000`
- the MinIO SDK tried to resolve bucket location using the presign host
- from inside the container, `localhost:9000` was the wrong place

In short, the code mixed up the internal storage endpoint and the external/public presign base URL.

The fix was to explicitly set the storage `Region` and initialize the presign client with that region, so presigning did not need to perform bucket location discovery against the wrong host.

Lesson:

- when a service has both internal and external addresses, treat them as separate concerns
- presigned URLs are especially sensitive because the host in the signed URL must be the one the client can reach

### Problem 5: Host shell tooling was incomplete

At one point, `gofmt` was not installed on the host shell.

Rather than stop the work, formatting and builds were run through a Go Docker image.

That is a small detail, but it shows a useful pattern:

- if the host environment is missing a tool
- and the project already depends on containers
- use the containerized toolchain to stay moving

This is often better than trying to mutate the host environment during task execution.

### Problem 6: Worker metrics env var was wired into the wrong service

During the observability phase, the worker metrics address environment variable was accidentally added to the API service section in Compose instead of the worker service.

The system still happened to work because the worker had a sensible default value, but the wiring was wrong.

This was fixed by moving the environment variable to the correct service block.

Lesson:

- even when something works, check whether it works for the right reason
- defaults can hide configuration mistakes

### Problem 7: Stateful Kubernetes services and rolling updates

The initial Kubernetes manifests used Deployments for Postgres, Redis, and MinIO with PVCs. That is acceptable for a small single-node demo, but there was an operational risk:

- the default deployment strategy can try to bring up a new pod before the old one is gone
- single-writer PVCs do not like two pods racing for the same volume

The fix was to switch these deployments to `Recreate`.

That is not glamorous, but it is the correct boring solution for this MVP.

Lesson:

- in infrastructure, "boring and predictable" is often better than "generic and clever"

### Problem 8: Kubernetes validation tooling quirks

Manifest validation also had a couple of workflow issues:

- the first `kubectl` container image choice was wrong
- another command ran into an entrypoint quirk
- one validation attempt raced a render step and ended up validating an empty file

These were not application bugs, but they are still real engineering issues. The fix was to slow down, choose the correct validation images, and validate the final rendered YAML with `kubeconform`.

Lesson:

- toolchain problems are still part of the job
- when validation output looks strange, verify the tool invocation before assuming the manifests are wrong

### Problem 9: Deciding how migration should work

There was a later product-and-operations question: should the system automatically migrate from a temporary provider to a cheaper long-term provider after a fixed amount of time?

The answer was "not as a blind scheduled cutover."

Why:

- the new server may not be ready
- DNS may not be correct
- image pulls may fail
- ingress may be broken

The safer design was:

- make deployment portable
- make redeployment easy
- make migration a human-triggered cutover once health checks pass

That is still highly automated, but it avoids a timer causing downtime.

### Problem 10: Public deployment readiness exposed missing rate limiting

Right before the project moved into CI/CD and public deployment work, one operational gap stood out:

- the API had timeouts
- the API had metrics
- but the expensive write paths did not have any rate limiting

That matters because this system has endpoints that can create real backend work:

- `POST /v1/uploads/presign`
- `POST /v1/jobs`
- `POST /v1/jobs/:id/retry`

Without rate limiting, a single client could create unnecessary storage URLs, flood the queue, or repeatedly requeue failed work. For a demo system on a small VPS, that is exactly the sort of gap that turns into noisy operational problems.

The fix was intentionally simple:

- add an in-process IP-based limiter in the API layer
- apply it only to the write-heavy routes
- keep the read routes open for normal status/result polling
- make the limits configurable through environment variables

Another subtle part of this fix was client identification.

Because traffic is expected to pass through Traefik in `k3s`, using only `RemoteAddr` would have been wrong or at least fragile. The limiter now prefers:

- `X-Forwarded-For`
- then `X-Real-IP`
- then `RemoteAddr`

This kept the first version practical without needing Redis-backed distributed rate limiting.

Lesson:

- public deployment readiness is not just "can it run in Kubernetes?"
- it is also "have the obvious abuse paths been bounded?"
- simple local controls are often the right first move before introducing more infrastructure

## 6. Why the Project Was Built Incrementally

One pattern appears throughout the whole project: do not build the fanciest version first.

Examples:

- queue consumption came before real image transforms
- image transforms came before presigned uploads
- request metrics came before worker metrics
- Kubernetes manifests came before CI/CD

This is good engineering practice because each phase creates a stable platform for the next one.

If you build everything at once, debugging becomes much harder because every failure has too many possible causes.

## 7. What Was Verified Along the Way

The work was repeatedly verified instead of only being trusted by reading code.

Examples included:

- building binaries inside containers
- bringing the Compose stack up fully
- creating real jobs through the API
- checking Redis queue depth
- checking Postgres state transitions
- checking generated MinIO outputs
- checking DLQ behavior with intentionally bad input
- scraping Prometheus metrics endpoints
- rendering and validating Kubernetes manifests

This is important. "Looks correct" is not enough for backend systems. Real verification closes the gap between theory and actual behavior.

## 8. What Still Remains

At the end of this journal, the project has:

- working local Docker runtime
- async image processing
- retries and DLQ
- presigned uploads and downloads
- metrics and structured logging
- `k3s` manifests

The main remaining phases are:

- GitHub Actions CI/CD
- final demo-oriented documentation and architecture diagram

The CI/CD phase now has an additional requirement:

- it should be easy to deploy to one VPS provider first and another later without redesigning the workflow

That means the system is already in a strong state. The remaining work is mostly about making delivery and presentation more complete.

## 9. Advice for a Junior Developer Reading This

If you are early in your career, the biggest lessons from this project are:

- Start from the constraints. Do not invent requirements the project does not need.
- Separate responsibilities cleanly. Queue, database, and object storage each have a job.
- Build in layers. Make one part trustworthy before stacking the next one on top.
- Verify with real behavior, not just code inspection.
- When something fails, test the input, the environment, and the assumptions before changing the design.
- Boring solutions are often the strongest solutions in backend and infra work.

## 10. Short Timeline Summary

If you want the short version, the project went like this:

1. create repo skeleton and Docker stack
2. add database schema and migrations
3. build job API and Redis queue integration
4. build worker claiming and status transitions
5. add real image processing and output storage
6. add retries and DLQ
7. add presigned upload and download URLs
8. add metrics and structured logs
9. add `k3s` manifests and deployment docs

That sequence is not accidental. It is the order that minimized risk while still moving the project toward a strong end-to-end demo.

## 11. Bare VPS Bring-Up and Server Hardening

One later phase moved from local and manifest-only work into a real VPS bring-up on SkyServer.

This part is worth spelling out because junior developers often underestimate how risky a fresh VPS is by default.

### The starting state of the VPS

The server arrived as a plain Ubuntu `22.04` machine reachable by:

- public IP
- username
- password
- direct `root` SSH login

That is convenient for first access, but it is not a good long-term posture for a public internet-facing box.

When the server was first inspected, it had:

- `root` SSH login enabled
- SSH password authentication enabled
- no firewall enabled
- no dedicated admin user

That is what "hardening" meant in this project: not turning the server into a fortress, but removing the obvious weak defaults before deploying public services.

### Why the hardening step came before application deployment

This was intentional.

If `k3s`, Traefik, MinIO, and the application are installed first, it becomes much easier to forget the host itself is still weakly configured.

The order used here was:

1. verify first login still works
2. establish key-based SSH access
3. create a non-root admin path
4. confirm the new path works
5. then disable risky access modes
6. then install `k3s`

That order matters because changing SSH settings too early can lock you out of the box.

### The exact hardening actions taken

The following changes were made on the SkyServer VPS:

- generated a dedicated SSH keypair for this server only
- installed that key for both `root` and a new `deploy` user during the transition
- created a `deploy` user
- added `deploy` to `sudo`
- enabled passwordless `sudo` for `deploy`
- updated system packages with `apt-get update && apt-get upgrade -y`
- installed and enabled `ufw`
- allowed only:
  - `22/tcp`
  - `80/tcp`
  - `443/tcp`
- changed the hostname to `node1.swiftbatch.abhinash.dev`
- disabled `PermitRootLogin`
- disabled `PasswordAuthentication`
- kept `PubkeyAuthentication` enabled
- verified key-based login still worked after the SSH config change

After that, the effective access model became:

- `deploy` user over SSH key
- `sudo` for administrative work
- no remote `root` login
- no SSH password login

### A small but important SSH configuration detail

One subtle problem showed up during this step.

At first, a new SSH hardening drop-in file was added with:

- `PermitRootLogin no`
- `PasswordAuthentication no`

But Ubuntu also had a cloud-init SSH drop-in file that still said:

- `PasswordAuthentication yes`

That meant SSH was not actually as locked down as intended yet.

The fix was to update the cloud-init drop-in as well and then validate the effective SSH daemon configuration. This is a useful lesson:

- do not trust only the file you edited
- verify the effective daemon config

### Why a dedicated SSH key was created

A local SSH key already existed on the workstation, but it was not the project owner's key and was being used for another purpose.

Reusing that key would have created identity confusion and unnecessary coupling.

So a new dedicated key was generated specifically for this VPS access path. That was the cleaner operational choice.

### How later login works

After hardening, future login is no longer:

- username + password

It is:

- `deploy` + the dedicated private key

Operationally, that is a better long-term setup because:

- it is safer than password SSH
- it gives one stable admin path for manual work and CI/CD
- it matches how later deployment automation is likely to access the box

### Installing `k3s` after hardening

Only after the SSH and firewall baseline was correct did the server get `k3s`.

That install also included:

- disabling swap
- commenting swap out in `/etc/fstab`
- copying kubeconfig into `/home/deploy/.kube/config`
- rewriting the kubeconfig server address to use the public IP for remote access

The first validation step was:

- check that the node becomes `Ready`

The second was:

- confirm bundled addons like `coredns`, `metrics-server`, and `traefik` come up

This gave the project its first real single-node cluster target.

### DNS clarification that came out of deployment

Earlier planning referred to Route 53 because AWS was being considered as the first deployment target.

That is no longer the correct assumption for the current server.

The active DNS management shown during setup is the `Lightsail` DNS zone for `abhinash.dev`. That means any deployment note that says "update Route 53" should now be read as:

- update the current DNS zone in the AWS Lightsail DNS UI

This is a good reminder that infrastructure plans drift, and the docs need to drift with them.

### The GitHub Container Registry credential tradeoff

When the first CI/CD deployment was wired, the initial assumption was that the cluster needed a credential to pull images from `ghcr.io`.

There are two separate GitHub authentication paths involved:

- the GitHub Actions workflow pushing images
- the running Kubernetes cluster pulling those images later

The workflow can push with GitHub Actions' built-in `GITHUB_TOKEN`, but the cluster cannot use that ephemeral workflow token after the job is over. It needs a long-lived credential stored as a Kubernetes image pull secret.

The workflow can push with GitHub Actions' built-in `GITHUB_TOKEN`, but the cluster cannot use that ephemeral workflow token after the job is over. That is why a separate long-lived pull credential often exists in private-package setups.

The first bootstrap temporarily used a broad GitHub token as `GHCR_PULL_TOKEN` because that was the normal pattern and it unblocked the first live deployment.

After the deployment succeeded, the actual package visibility was checked and all published SwiftBatch container images were confirmed to be `public`.

That changed the right answer.

For a public repository with public GHCR images:

- GitHub Actions still needs `GITHUB_TOKEN` to push images during the workflow
- the cluster does not need a separate pull secret
- Kubernetes can pull the images anonymously

So the cleaner fix was not "make a smaller token." The cleaner fix was:

- remove `ghcr-pull-secret`
- remove `GHCR_PULL_TOKEN` from the deployment requirements
- simplify the deployment model

This is the better lesson for a junior engineer:

- least privilege matters
- but removing a secret entirely is even better than shrinking it
- the simplest secure design is often the one with fewer credentials

If the repo or package visibility becomes private later, a dedicated `read:packages` token should be added back at that time.

### Rate limiting as a late but necessary correction

One operational gap surfaced near the end of the backend build:

- the API had timeouts
- the API had metrics
- but it did not have request rate limiting

That mattered because the most expensive public endpoints are:

- `POST /v1/uploads/presign`
- `POST /v1/jobs`
- `POST /v1/jobs/{id}/retry`

Without a limiter, a simple burst or abuse pattern could force unnecessary object writes, queue growth, retries, and worker load.

The fix was intentionally small and targeted:

- add an in-memory, IP-based limiter in the API server
- make it proxy-aware by checking `X-Forwarded-For`, then `X-Real-IP`, then `RemoteAddr`
- apply it only to the write-heavy endpoints
- return `429` when limits are exceeded

The first configured defaults were:

- presign: `20/min` with burst `5`
- job create: `30/min` with burst `10`
- retry: `6/min` with burst `2`

This was not meant to be a perfect distributed rate-limiting system. It was meant to close a real operational hole with the smallest implementation that matches the current architecture.

### TLS had to become real once browsers forced HTTPS

After the first live deployment, the public hosts were reachable over plain HTTP, but modern browsers kept upgrading to HTTPS automatically.

That exposed a real usability problem:

- the service itself was healthy
- but the browser experience still looked broken because there was no trusted certificate

The fix was to stop treating TLS as optional deployment polish and make it part of the real environment.

The chosen approach fit the existing stack:

- keep the bundled `k3s` Traefik
- customize it with a `HelmChartConfig`
- enable Let's Encrypt HTTP-01
- persist ACME state on disk
- redirect HTTP to HTTPS

This mattered for two reasons:

- browsers would now open the app normally
- presigned MinIO URLs also needed the public storage host to move to `https`

One subtle failure happened during the manual TLS rollout:

- the one-off deploy command accidentally reused the migrate image for the API container image
- that caused the new API pod to crash-loop because the migration binary exits after finishing its work

The fix was simple once the pod description made the problem obvious:

- restore the API deployment image to `ghcr.io/vectorsigmaomega/swiftbatch-api:latest`

The important lesson is not "never make mistakes during ops work." The lesson is:

- verify the live pod spec after a manual deployment
- look at the actual image names when behavior is strange
- separate the TLS change from unrelated rollout issues

Once Traefik finished ACME issuance, the public hosts served valid Let's Encrypt certificates and the browser warning problem went away.

### A minimal frontend finally made the deployment feel real

Once the backend was live, the main public URL still returned `404`.

That was technically fine for an API, but wrong for a portfolio project.

The key decision was to avoid jumping straight into a separate frontend stack. That would have added more deployment surface area before proving the most important thing:

- can a real browser use the existing API successfully

So the first frontend was intentionally small and practical:

- serve embedded static files directly from the Go API at `/`
- upload a real image from the browser
- request a presigned upload URL
- `PUT` the file to MinIO
- create the async job
- poll job status
- show download links when processing completes
- allow manual retry when a job ends in `failed` or `dead_lettered`

This choice kept the architecture stable:

- same API binary
- same ingress
- same deploy workflow
- no separate frontend build system yet

One subtle issue came with this browser flow:

- presigned uploads go to the storage host, not the API host
- from the browser's point of view, that is cross-origin traffic

That meant MinIO needed explicit CORS permission for the frontend origin. Without that, the UI could look correct and still fail at the upload step.

The first attempted fix was to configure CORS with `mc cors set` during bucket bootstrap.

That turned out to be the wrong operational path for this setup. The MinIO client returned:

- `A header you provided implies functionality that is not implemented.`

So the implementation was corrected to use MinIO's global CORS setting instead:

- Docker Compose sets `MINIO_API_CORS_ALLOW_ORIGIN`
- the `k3s` deployment sets the same value from config

That kept the browser upload flow working without turning deployment into a repeated init-container failure.

This is a good example of the kind of problem that only appears when a system stops being "backend tested" and starts being "browser tested."
