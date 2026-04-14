# Front Page Mockup Implementation Plan

This plan details the necessary steps to implement the new front page design for Pelilauta 20 based on the provided mockup. This plan is transient and should be removed once the work is shipped.

## 1. Missing Features & Additions to Design System (`packages/cyan` / `app/cyan-ds`)

### 1.1 Glassmorphism & Immersive Themes
- **Tokens/Variables**: Define `--cn-surface-glass` (or similar) token in `chroma.css`/`semantic.css` that leverages partial transparency combined with solid root tokens.
- **Layout Support**: Update layouts (like `AppShell.astro` and `Page.astro`) to natively support an application-level background image over which content overlays.
- **Utility Support**: Adding utility properties (e.g. `backdrop-filter: blur`) to create the glass pane effect inside the CSS framework.

### 1.2 Masonry Layout
- **Structure**: Introduce a CSS-only multi-column flow or a dedicated Grid/Masonry component (e.g., in `content-grid.css`) capable of efficiently sorting varied-height `CnCard` items into parallel columns (e.g., 3 columns as per the mock).

### 1.3 Floating Action Button (FAB)
- **New Component**: Create `CnFab.svelte` — a resilient fixed/absolute positioned pill Action button located at the bottom-right corner spanning an icon and text (e.g., Paper Plane + "Uusi keskustelu"). 

### 1.4 Card Enrichments (`CnCard.svelte`)
- **Top Context Area**: Enhance `CnCard.svelte` with an optional `context` or `meta-header` block mapping to the mock's thread subject string like "Aiheessa pelisuunnittelu".
- **Metadata Footer Area**: Provide an explicit `footer` slot alongside the existing `actions` block to afford inline metadata layout (like the mock's Author Avatar, Date, Likes ❤️, and Comment 🗨️ count row).
- **Transparent Base**: The component needs to support a translucent or "glass" context layout instead of being strictly confined to `elevation-*` flat/solid surface colors.

### 1.5 Tray & Rail Navigation
- **Notification Badges**: Expand `TrayButton.astro` to cleanly accept a `badge` notation (like the "2" notifications count next to Inbox).
- **Rail Grouping**: Make sure the navigation container easily handles a CSS margin flex spacer (e.g. `.spacer { margin-top: auto; }`) for pushing items systematically to the bottom pinning them tightly (Admin, Info, User Profile).

### 1.6 Icon Registry Requirements
- Verify/Import the exact symbols used in the UI: Search, Share, Speech-Bubbles (Replies), Heart (Likes), Paper Plane, Eye, Asterisk, Wolf/Site Logo.

---

## 2. Missing Features & Additions to Main Site (`app/pelilauta`)

### 2.1 Refactoring `index.astro` Shell Structure
- **Layout Assignment**: Modify `<Page layout="view">` into `<Page layout="sidebar">` to mount the foundational App Tray Navigation.
- **Inject Image Assets**: Provision and integrate the high-resolution forest artwork backdrop.
- **App Bar Injection**: Slot the *Search* and *Reply/Share* floating icons directly to the `<Page slot="actions">`.

### 2.2 Content Aggregation
- **View Modeling**: Replace `.cn-content-triad` with the respective Masonry container logic handling the 3 streams.
- **The Content Spread**: 
  - Column 1: Native Forum threads powered by `TopThreadsStream.astro` connected to `ThreadCard` propagating likes/comments.
  - Column 2: Adventure & RSS feeds like Myrrys.com and Legenda 3.
  - Column 3: Site/Blog feeds mapping to the respective updated CnCards (e.g., Hepro, RotRIV).

### 2.3 Component Instantiations
- **Wire the App Tray**: Replace missing Tray links aligning functionally with:
  - Top: Foorumi, Kirjasto, Inbox (badge="2").
  - System Spacer `mt-auto`.
  - Bottom: Admin, Info, User Profile Action.
- **Activate FAB Component**: Instatiate the `<CnFab label="Uusi keskustelu" icon="paper-plane" />` directly on the `index.astro` page.
