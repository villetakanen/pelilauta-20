# Feature: Cyan Unit Tokens

Parent: [Cyan DS Tokens](../spec.md)

## Blueprint

### Context

Unit tokens define the spatial and sizing primitives for the Cyan design system. The entire system derives from a single 8px grid unit (`--cn-grid: 0.5rem`), making it rescalable by changing one value. All tokens are `cn-`-prefixed to avoid collisions in multi-library environments.

### Architecture

- **Source:** `packages/cyan-css/src/tokens/units.css` (upstream: [cyan-design-system-4](https://github.com/villetakanen/cyan-design-system-4))
- **Scope:** CSS custom properties on `:root`

### Token Inventory

#### Base Grid

| Token | Derivation | Computed (16px root) |
|---|---|---|
| `--cn-grid` | `0.5rem` | 8px |
| `--cn-gap` | `grid × 2` | 16px |
| `--cn-line` | `grid × 3` | 24px |

`grid` is the atomic unit. `gap` is the standard element spacing. `line` is the standard row height.

#### Border Radius

All derived from `--cn-grid`:

| Token | Multiplier | Computed |
|---|---|---|
| `--cn-border-radius-small` | `× 0.5` | 4px |
| `--cn-border-radius-medium` | `× 1` | 8px |
| `--cn-border-radius-large` | `× 2` | 16px |
| `--cn-border-radius-xl` | `× 4` | 32px |

#### Icon Sizes

Absolute `rem`-based values (not grid-derived). Scale is non-linear:

| Token | Computed |
|---|---|
| `--cn-icon-size-xsmall` | 16px |
| `--cn-icon-size-small` | 24px |
| `--cn-icon-size` (default) | 36px |
| `--cn-icon-size-large` | 72px |
| `--cn-icon-size-xlarge` | 128px |

#### Navigation / Layout

| Token | Derivation | Computed |
|---|---|---|
| `--cn-navigation-icon-label-height` | `grid × 2` | 16px |
| `--cn-width-rail` | `grid × 10` | 80px |
| `--cn-height-rail` | `grid × 9` | 72px |
| `--cn-width-tray` | `grid × 42` | 336px |

### Anti-Patterns

- **Don't use magic pixel values** — always reference or derive from `--cn-grid` for spatial tokens. Icon sizes are the exception (they follow their own scale).
- **Don't duplicate the grid constant** — if the grid base changes, all derived tokens must follow automatically via `calc()`.

## Contract

### Definition of Done

- [ ] All spatial tokens resolve correctly at default 16px root font size
- [ ] Changing `--cn-grid` propagates to all derived tokens
- [ ] No namespace collisions — all tokens prefixed with `cn-`

### Regression Guardrails

- `--cn-grid` must remain `0.5rem` unless a coordinated system-wide change is intended
- Icon size tokens must not be changed to grid-derived values (they follow a distinct design scale)

### Known Discrepancies in Upstream Source

The upstream file contains inline comments that disagree with the computed values:

| Token | Comment | Actual |
|---|---|---|
| `--cn-border-radius-large` | 12px | 16px |
| `--cn-border-radius-xl` | 16px | 32px |
| `--cn-width-tray` | 160px | 336px |

These should be corrected upstream or the multipliers adjusted to match intent.
