# Plan: Migrate Principles

This document coordinates the migration of core design principles from the [Cyan 4 Netlify Deployment](https://cyan-4.netlify.app/principles/) to the new `pelilauta-20` codebase.

## Status Summary

- **Total Pages Identified:** 6
- **Completed:** 3 (Chroma, Semantic Colors, Content Grids)
- **Pending:** 3 (Units & Grid, Iconography, Elevation)
- **Review Needed:** Typography Scale Correction

## Migration Order (Logical Priority)

1.  **Units & Grid (`units-and-grid.mdx`)**
    - *Dependency:* Foundational for all spacing/layout.
    - *Content:* Spacing Scale, Border Radius, 8px Grid definition.
2.  **Iconography (`iconography.mdx`)**
    - *Dependency:* Relies on icon size tokens in Units.
    - *Content:* standard sets, size comparator.
3.  **Elevation (`elevation.mdx`)**
    - *Dependency:* Relies on surface/depth tokens.
    - *Content:* Shadow system, surface-layer contrast.
4.  **Typography (`typography.mdx`)**
    - *Action:* **UPDATE** existing page to align with the authoritative **Major Third (1.25)** scale.
    - *Content:* Corrected h1-h4 tokens, type scale list demo.
5.  **Themes/Mapping (`semantic-colors.mdx`)**
    - *Action:* **UPDATE** to refine Chroma-to-Surface mappings.

---

## Interactive Components To-Do

The following documenting components must be prioritized to ensure parity with the "Wow" factor of the original site:

- [ ] **TypeScaleList:** Renders H1, H2, H3, H4, Body, Caption in situ.
- [ ] **ElevationBoxDemo:** Shows 4 levels of depth with nested items.
- [ ] **IconSizeComparator:** Side-by-side view of all `--cn-icon-size-*` tokens.
- [ ] **SpacingVisualizer:** Vertical/horizontal bars demonstrating the 8px grid scale.
- [ ] **ContrastAudit:** Component showing various text treatments on Elevation 1-4 for WCAG compliance verify.

## Confirmed Truths (Review Required)

| Item | Authority Site | Previous Project Decison | Truth for v20 |
|---|---|---|---|
| **Typo Scale** | 1.414 (Augmented Fourth) | **1.25 (Major Third)** | [PENDING USER] |
| **Grid Base** | 8px | 8px | 8px (Confirmed) |
| **Base Font** | Lato (17px) | Lato (17px) | Lato (17px) (Confirmed) |
| **Colors** | Chroma (HCL/OKLCH) | Chroma | Chroma (Confirmed) |
