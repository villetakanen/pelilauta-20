# Cyan v20 Front Page Gap Analysis

This report identifies the components and design system features missing from the Cyan v20 design system that are required to redesign the [Pelilauta](https://pelilauta.social) front page.

## Current State vs. Requirements

The existing Pelilauta front page (v19) is a content-dense feed driven by user-generated discussions, tags, and external resource links. To replicate and enhance this in v20, we need several foundational "content" components that do not yet exist.

### 1. Feed & Card System [CRITICAL]
The front page is primarily a list of discussion threads.
- **Missing Component**: `CnCard.astro`. A container with elevation and padding tokens.
- **Missing Component**: `CnThreadSummary.astro`. A specialized card variant or layout for the feed items (Avatar + Title + Snippet + Metadata).
- **Missing Token Pattern**: Content Grid / Masonry. We need a way to layout these cards.

### 2. Taxonomy & Tags [HIGH]
The "Suositut aiheet" (Popular topics) section uses tags to navigate content.
- **Missing Component**: `CnTag.astro` or `CnPill.astro`. Support for hover states and potentially icons.
- **Missing Component**: `CnTagGroup.astro`. To handle wrapping and spacing of multiple tags.

### 3. Editorial Typography [MEDIUM]
While base typography and utilities (`.text-small`, `.text-caption`) exist, the front page needs specific semantic levels and refinements:
- **Missing Level**: `Editorial Heading`. Larger, high-impact headings (e.g., `5rem+`) for the hero/splash area.
- **Refinement Required**: Semantic grouping of metadata. Patterns for combining `.text-caption` with icons for the feed metadata.

### 4. Layout & Rhythm [MEDIUM]
- **Missing Component**: `CnSection.astro`. A wrapper for major front page sections (Feed, Popular Topics, Links) with standard vertical spacing.
- **Missing Component**: `CnDivider.astro`. Subtle semantic separation.

### 5. Call to Action (CTA) [MEDIUM]
- **Missing Component**: `CnButton`. We have `TrayButton`, but need a standalone button component for "Näytä lisää" (Show more) and "Kirjaudu" (Login) actions with proper variants (Primary, Secondary, Ghost).

## Proposed Implementation Order

1. **Phase 1: Cards & Typography**
   Build `CnCard` and finalize `.text-caption` / `.text-small` utilities. This allows us to render the feed.
   
2. **Phase 2: Tags & Buttons**
   Implement `CnTag` and `CnButton` to handle interactive secondary content.

3. **Phase 3: Grid & Sections**
   Develop `CnContentGrid` or `CnSection` to provide the structural "glue" that binds the components into a page.

---

> [!NOTE]
> The current `AppBar` and `Tray` are ready to handle the shell. All missing components should be built as **Astro components** following the "CSS-first" principle.
