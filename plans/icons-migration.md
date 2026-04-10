# Icons Migration: Proposed Mapping

This document proposes the migration path for icons from the legacy `cyan-design-system-4` repository to the new 3-tier architecture in `pelilauta-20`.

## Tier 1: `@pelilauta/icons` (Community / MIT)
*General purpose UI icons and MIT-licensed brand assets.*

- `add.svg`
- `arrow-down.svg`
- `arrow-left.svg`
- `arrow-up.svg`
- `assets.svg`
- `avatar.svg`
- `bubble.svg`
- `card.svg`
- `check.svg`
- `chevron-left.svg`
- `clock.svg`
- `close.svg`
- `components.svg`
- `compose.svg`
- `copy-md.svg`
- `css.svg`
- `delete.svg`
- `design.svg`
- `dots.svg`
- `drag.svg`
- `edit.svg`
- `experiment.svg`
- `file-pdf.svg`
- `filter.svg`
- `font.svg`
- `fork.svg`
- `fox.svg` (As per `cn-icon` spec, Tier 1 MIT)
- `idea.svg`
- `import-export.svg`
- `info.svg`
- `kebab.svg`
- `layout.svg`
- `login.svg`
- `love.svg`
- `mekanismi.svg` (As per `cn-icon` spec, Tier 1 MIT)
- `open-down.svg`
- `palette.svg`
- `pdf.svg`
- `quote.svg`
- `reduce.svg`
- `save.svg`
- `share.svg`
- `tools.svg`

## Tier 2: `@myrrys/proprietary` (Proprietary / Fair Use)
*RPG-specific branded icons, trademarked logos, and proprietary assets managed via the `myrrys-proprietary` subrepo.*

- `adventurer.svg` (Guessed proprietary character icon)
- `books.svg` (Likely proprietary assets)
- `d8.svg`, `d12.svg`, `d20.svg` (If these are specifically styled for Myrrys)
- `dd5.svg` (D&D 5e - Fair use)
- `discussion.svg`
- `gamepad.svg`
- `google.svg` (Branded)
- `hood.svg`
- `karu.svg` (Proprietary)
- `monsters.svg`
- `moon.svg`
- `myrrys-scarlet.svg` (Proprietary Brand)
- `pathfinder.svg` (Branded / Fair use)
- `pbta.svg` (Branded / Fair use)
- `spiral.svg`
- `veil-advance.svg` (Likely PbtA game specific)
- `youtube.svg` (Branded)
- `admin.svg` (Licensed / Noun Project)
- `homebrew.svg` (Licensed / Noun Project)
- `ll-ampersand.svg` (Myrrys Proprietary)
- `send.svg` (Licensed / Noun Project)
- `thequick.svg` (Myrrys Proprietary)
- `tokens.svg` (Licensed / Noun Project)

## Source / Asset Exclusions
*These files should be kept in a separate `assets/` or `source/` directory (e.g. within the `myrrys-proprietary` subrepo) but NOT distributed as part of the icon runtime.*

- `arrow-down.afdesign`
- `arrow-left.afdesign`
- `arrow-up.afdesign`
- `drag.afdesign`
- `fork.afdesign`
- `fox-color.afdesign`
- `kebab.afdesign`

## Notes & Open Questions

- **Dice Icons**: If `d20`, `d12`, and `d8` are generic "wireframe" icons, they could move to Tier 1. If they are specifically styled for the Myrrys aesthetic, they stay in Tier 2.
- **Fox/Mekanismi**: The existing `cn-icon` spec explicitly lists these as Tier 1 MIT assets.
- **Fair Use**: Icons like `google`, `youtube`, `pathfinder`, and `dd5` are categorized in Tier 2 to ensure they are managed under the proprietary registry, which allows for more granular license control than the general community MIT package.
