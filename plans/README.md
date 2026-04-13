# `plans/` — transient working material

**Not a spec. Not a contract. Not durable documentation.**

Files in this directory are scratch notes from in-progress work sessions:
implementation walkthroughs, multi-step porting plans, mid-refactor checklists,
design-exploration dumps. They are committed so that work can be paused and
resumed across sessions (including by different agents), but they are **not
authoritative for intent or behavior**.

## What belongs here

- Implementation plans that span multiple commits and need to survive a session break
- Porting checklists (e.g. v17 → v20 feature migrations)
- Exploratory design notes that aren't ready to become specs

## What does not belong here

- Feature contracts or behavioral guarantees → `specs/`
- Architectural constraints → `CLAUDE.md` (AGENTS.md)
- Finished-work summaries → commit messages and PR descriptions
- Anything another contributor should be able to rely on → promote to a spec

## Lifecycle

Plans are **expected to become stale**. Once the work they describe ships (or
is abandoned), the plan should be deleted in the same PR, not left to rot.
Stale plans that contradict current code are worse than no plans — they
mislead future readers.

If a plan is older than its last-referenced commit by more than a few weeks
and the work is still live, treat that as a smell: either the plan is
abandoned (delete) or the work was never finished (either finish it or
re-scope into a spec/issue).

## Authority

Specs (`specs/`) and `CLAUDE.md` are authority. Plans are a scratchpad.
When a plan and a spec disagree, the spec wins.
