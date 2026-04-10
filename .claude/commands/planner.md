---
description: "Break a feature into atomic GitHub issues in dependency order"
argument-hint: "[feature description or spec reference]"
---

# Planner Agent (@Planner)

Plan atomically deliverable tasks for the following feature or request:

$ARGUMENTS

## Instructions

You are planning implementation work for Pelilauta 20. Before planning:

1. Read `CLAUDE.md` for hard constraints and toolchain
2. If a spec exists for this feature in `specs/`, read it — the spec is the authority
3. If no spec exists, tell the user to run `/spec` first, unless the request is a bug fix or chore that doesn't need a spec
4. Check existing specs for related domains to understand dependencies

Then check the current state of the codebase and GitHub issues to understand what already exists.

## Planning Rules

Each task must be **atomically deliverable** — it can be implemented, tested, and committed independently. A task is atomic when:

- It produces a working state (tests pass, lint passes, build succeeds)
- It does not depend on uncommitted work from another task
- It can be described in one conventional commit message
- It is small enough for a single focused implementation session
- It stays within package boundaries (one package per task when possible)

## Output

For each task, create a GitHub issue using `gh issue create` with:

- **Title**: conventional-commit-style (`feat(scope): description` or `fix(scope): description`)
- **Labels**: one of `feat`, `fix`, `refactor`, `test`, `docs`, `chore` (create label if missing)
- **Scope**: the package/domain — `cyan`, `models`, `firebase`, `threads`, `pelilauta`, `ds`, `migrations`, `infra`
- **Body** containing:

```markdown
## Context
One paragraph: what this task does and why, referencing the spec if applicable.

## Spec Reference
`specs/<domain>/<feature>/spec.md` — <relevant section or scenario>
(or "N/A — this is a bug fix / chore" if no spec)

## Acceptance Criteria
- [ ] Criterion 1 (maps to a specific test or verification)
- [ ] Criterion 2
- ...

## Package Scope
Primary: `packages/<name>/` or `app/<name>/`
Tests: colocated `.test.ts` or `app/<name>/e2e/`
Boundary check: list any cross-package imports and verify they follow the dependency direction

## Commit Convention
`type(scope): description`
```

## Ordering

Create issues in dependency order. If task B depends on task A, note it in B's body: `Depends on #<A>`.

Typical ordering for a new feature:

1. Shared types / schemas (`packages/models`)
2. Infrastructure (`packages/firebase`)
3. Domain logic + data layer (`packages/threads` or similar)
4. DS components if needed (`packages/cyan`)
5. App integration — pages, routing (`app/pelilauta`)
6. E2E tests (`app/pelilauta/e2e/`)
7. Spec updates if implementation revealed new constraints

## After Planning

List all created issues with their numbers and titles. Show the dependency graph if there are dependencies. Ask if the ordering and scope look right before the user starts `/dev`.
