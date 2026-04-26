# Future Project Efficiency Checklist

This document is a checklist for agents working on future projects where efficiency matters.

The goal is to reduce wasted implementation effort, reduce token burn, and keep the work focused on the actual MVP.

## Rule 0: Do Not Build Against Ambiguity

If the planning phase is vague, broad, or underspecified, stop and force clarification before implementation.

Do not proceed when any of these are unclear:

- what the product actually does
- who the user is
- what the MVP must include
- what is explicitly out of scope
- what “done” means
- where the system will run
- whether the frontend is required
- whether persistence really matters
- whether deployability is part of the scope

If these are missing, the agent should push back and make the user define them first.

## Planning Checklist

Before building, confirm:

- problem statement is one or two sentences
- MVP scope is explicit
- non-goals are explicit
- target deployment environment is chosen
- data retention expectations are chosen
- auth model is chosen or explicitly absent
- frontend strategy is chosen:
  - no frontend
  - embedded static UI
  - separate frontend app
- observability expectations are chosen:
  - none
  - basic metrics/logging
  - full dashboards
- CI/CD expectations are chosen:
  - none
  - build only
  - full deploy automation

If the project is a portfolio piece, also confirm:

- what the public demo must show
- what GitHub/README must show
- whether an engineering walkthrough page is required

## Scope Control Checklist

Before each phase, ask:

- is this required for the MVP
- is this required for the live demo
- is this required for the current phase
- is this a real dependency or just a nice-to-have

Avoid pulling in extra work early:

- polished frontend before backend proof
- advanced infrastructure before local proof
- dashboards before core flow works
- migration tooling when data is disposable
- multi-environment support before one environment works

## Architecture Checklist

Prefer the smallest architecture that still proves the engineering point.

Ask:

- can this be a single service instead of multiple services
- can this be one deployable unit instead of two
- can static UI be embedded instead of creating a full frontend app
- can one queue/database/storage layer be enough for the MVP
- can a simple deploy model replace a more abstract one

Do not add abstraction early unless:

- the project clearly needs it now
- or the brief explicitly requires it

## Implementation Checklist

Before editing:

- read the relevant files
- identify the exact integration points
- identify likely failure surfaces
- decide how the change will be verified

During implementation:

- prefer small, composable changes
- keep the deployment model stable where possible
- avoid speculative refactors
- avoid adding framework weight unless it pays for itself immediately

## Verification Checklist

Always verify at the right level.

For backend/API work:

- run tests if available
- exercise the changed endpoint
- check error behavior, not just success behavior

For browser-facing work:

- test locally before pushing
- verify CORS if browser talks cross-origin
- verify the real user flow, not just page render

For deployment work:

- validate manifests or config first
- verify rollout status
- inspect live runtime state if deploy blocks
- verify public URLs only after rollout is healthy

If the environment lacks local tooling, the agent must say so explicitly and use the next best reliable verification path.

## Documentation Checklist

Only update docs that materially changed, but do update them.

After meaningful changes, check whether these need updates:

- `README.md`
- `docs/build-journal.md`
- `docs/backlog.md`
- deployment docs
- operations docs

Document:

- what changed
- why it changed
- what failed
- how it was fixed
- what remains

## Communication Checklist

The agent should:

- communicate clearly before doing substantial work
- state assumptions explicitly
- separate verified facts from inference
- state blockers early
- say when a design choice is being made for speed versus long-term purity

The agent should not:

- hide uncertainty
- present unverified behavior as done
- keep working for too long against undefined scope
- let the project drift because the user’s request was broad

## Efficiency Heuristics

To save time and tokens:

- reuse a prepared starter template when possible
- choose providers and deployment target early
- choose the frontend approach early
- keep one short decision log
- avoid re-reading the entire repo repeatedly
- batch related edits together
- batch documentation at phase boundaries
- avoid teaching-mode verbosity unless the user wants it
- avoid solving future hypothetical problems unless they are likely soon

## Phase Gate

Do not move to the next phase until the current phase is actually complete.

Typical gates:

- local runtime works
- deployment works
- public demo works
- docs reflect reality

## Definition Of Done

A task is done only when:

- the implementation exists
- the relevant behavior is verified
- the scope is still under control
- the documentation matches reality
- the repo is left in a clean state
