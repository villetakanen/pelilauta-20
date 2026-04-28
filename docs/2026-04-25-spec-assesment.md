# Spec Frontmatter Assessment (2026-04-25)

## Overview

As Pelilauta 20 matures, our specifications must move from transient design notes to authoritative functional contracts. Currently, our spec frontmatter is minimal and lacks the metadata required for system-wide tracking of maturity, ownership, and last-verified state.

## Proposed Frontmatter Schema (v2)

To enable automated tracking and better human situational awareness, all specs should move toward this expanded frontmatter:

```yaml
---
feature: [Name]
status: [draft | alpha | stable | deprecated]
maturity: [design | implementation | verified]
last_major_review: 2026-04-25
parent_spec: [path]
stylebook_url: [url] # Optional
---
```

### Definitions
- **Status:**
    - `draft`: Initial thoughts, not yet ready for implementation.
    - `alpha`: Blueprint complete, implementation in progress.
    - `stable`: Implementation complete and verified against contract.
    - `deprecated`: Replaced by a newer spec or feature.
- **Maturity:**
    - `design`: Architecture and contract are defined.
    - `implementation`: Code exists but might not satisfy the full contract.
    - `verified`: Automated tests (Vitest/Playwright) cover all scenarios and are green.

---

## Current Assessment

### 1. The "Template Gap"
The current `specs/TEMPLATE.md` only defines `feature`, `parent_spec`, and `stylebook_url`. It lacks fields for status, maturity, and dates.
**Recommendation:** Update `specs/TEMPLATE.md` immediately.

### 2. The Implementation Status (Sampled)

| Spec Path | Estimated Status | Estimated Maturity | Notes |
| :--- | :--- | :--- | :--- |
| `specs/pelilauta/auth/spec.md` | `stable` | `verified` | Has comprehensive Gherkin and test mappings. Implementation is complete. |
| `specs/cyan-ds/tokens/chroma/spec.md` | `stable` | `verified` | Deeply technical, well-tested. |
| `specs/pelilauta/front-page/top-threads-stream/spec.md` | `stable` | `verified` | Data-bound implementation complete. |
| `specs/pelilauta/spec.md` | `alpha` | `design` | Root spec, often serves as a directory rather than a contract. |
| `specs/pelilauta/auth-package/spec.md` | `draft` | `design` | Seems redundant with `auth/spec.md` or is a legacy remnant. |

### 3. Missing Test Mappings
A significant number of specs in `specs/cyan-ds/components/` define "Definition of Done" but lack the specific **Vitest Unit Test** and **Playwright E2E Test** file path mappings required by the template.

**Critical Offenders:**
- `specs/cyan-ds/components/cn-hero/spec.md` (Deferred in code, but needs spec completion)
- `specs/cyan-ds/components/tray/spec.md`

## Action Plan

1. **[ ] Update Template:** Apply the v2 frontmatter schema to `specs/TEMPLATE.md`.
2. **[ ] Batch Update:** Use a script or agent task to add `status: stable` and `maturity: verified` to specs that are already confirmed green by CI.
3. **[ ] Gap Audit:** Perform a deep dive into `specs/cyan-ds/` to ensure every component has its test mappings defined in the frontmatter or Contract section.

---
*Assessed by Gemini CLI on 2026-04-25*
