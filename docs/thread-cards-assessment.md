# Thread Cards Assessment: v17 vs v20 MVP

This document provides an assessment of the legacy thread cards on the v17 live site (pelilauta.social) compared to the newly implemented `ThreadCard` component within the v20 MVP (utilizing Cyan Design System's `CnCard`).


## 1. Legacy v17 Thread Cards

Based on a live assessment of `https://pelilauta.social`, the legacy thread cards employ a dense, multi-link structural design designed for quick navigation and rich information display.

### Visual Hierarchy & Layout
* **Primary Focus**: The **Thread Title** is the most prominent element, rendered in a large, semi-bold sans-serif font.
* **Categorization**: A **Thread Icon** sits to the left of the title, instantly communicating the thread's topic/type.
* **Secondary Links**: The **Channel Name** is placed just beneath the title as a smaller, distinct blue hyperlink.
* **Content Snippet**: A 3-4 line preview of the thread content serves as the body of the card.
* **Footer & Metadata**: A faint horizontal divider separates the main content from a split footer row. The footer contains the **Author and Date** on the left, and a **Reply Count** (often with an icon) on the right.
* **Container**: Cards have rounded corners, a white background, and a subtle drop shadow for depth, with roughly `1rem` of internal padding.

### Interactivity Model
* **Multi-point Navigation**: The card is **not** a single unified link (card-as-a-button). The background is passive.
* **Granular Targets**:
  * **Title** -> Navigates to the thread.
  * **Channel** -> Navigates to the channel view.
  * **Author** -> Navigates to the user's profile.
  * **Reply Count** -> Jumps to unread replies.
  * **Snippet** -> Links/mentions inside the text are clickable.

## 2. v20 MVP Implementation (`ThreadCard` + `CnCard`)

In the Pelilauta 20 MVP, the top threads stream (`TopThreadsStream.astro`) renders `ThreadCard.svelte`, which acts as a domain wrapper around the core `CnCard.svelte` component from the Cyan Design System.

### Visual Hierarchy & Layout
* **Foundation**: `CnCard` provides the structural container (`elevation`, `border-radius`, typography tokens). 
* **Header**: The title is placed inside `.card-header` as an `<h4>`. The `noun` prop adds an icon either next to the title or on the cover image (if one exists).
* **Body Content**: `ThreadCard` injects three paragraphs into the `.card-info` slot:
  1. The channel link.
  2. The plaintext snippet (`markdownToPlainText` truncated to 220 characters).
  3. The `ProfileLink` (author).
* **Missing Features vs v17**:
  * The distinct footer separated by a divider is not currently utilized by `ThreadCard`. The author profile link simply follows the snippet in the normal flow.
  * Reply count and dates are not currently surfaced in the `ThreadCard` implementation.

### Interactivity Model
* **Aligned with Legacy**: `CnCard` correctly avoids the "card-as-a-button" anti-pattern. The `href` passed to `CnCard` only wraps the title text and the optional cover image.
* **Nested Links**: Because the entire card is not an `<a>` tag, `ThreadCard` can safely nest the `<a href="/channels/...">` and the `ProfileLink` component within the card body without causing invalid HTML or overlapping click targets.

## 3. Conclusions and Next Steps

The structural foundation of the v20 `ThreadCard` accurately captures the multi-link interaction model necessary for the platform. `CnCard` is flexible enough to support the legacy use cases.

**Areas for Improvement (Feature Parity):**
1. **Footer Layout**: To match the visual clarity of v17, `ThreadCard` should potentially use the `actions` slot of `CnCard` or implement a custom footer grid within the default slot to house the author profile, date, and reply counts.
2. **Metadata**: Add thread creation/activity dates and reply counts to the `ThreadSchema` and `ThreadCard` component.
3. **Typography Alignment**: Ensure the hierarchy of the channel link relative to the snippet and title matches the established legacy weight and scale.
