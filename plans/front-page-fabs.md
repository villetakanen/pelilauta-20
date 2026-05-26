# Plan: Reversing Front-Page FABs and Frozen State Checking

This transient plan provides the implementation details and task checklist for executing the Front-Page FAB and Frozen Account gating feature.

## Technical Design

### 1. Design System Layout (packages/cyan)
Add a standardized fixed-position container for floating action buttons in the bottom-right corner.
- **File:** `packages/cyan/src/layouts/AppShell.astro`
  - Add slot: `<nav class="cn-fab-tray"><slot name="fab-tray" /></nav>`
  - Style:
    ```css
    .cn-fab-tray {
      position: fixed;
      bottom: var(--cn-gap, 1rem);
      right: var(--cn-gap, 1rem);
      z-index: var(--cn-z-fab, 2000);
      display: flex;
      flex-direction: column;
      gap: var(--cn-grid, 0.5rem);
    }
    ```
- **File:** `packages/cyan/src/layouts/Page.astro`
  - Forward the slot: `<slot name="fab-tray" slot="fab-tray" />`

### 2. Account Schema & Accessor (packages/auth)
- **File:** `packages/auth/src/server/account.ts`
  - Export Zod `AccountSchema` with `frozen: z.boolean().optional().default(false)`.
  - Export `getAccount(uid: string): Promise<Account | null>` using admin Firestore `getDb().collection("account").doc(uid).get()`.

### 3. Session Oracle Integration (app/pelilauta)
- **File:** `app/pelilauta/src/pages/api/auth/status.ts`
  - Update the `/api/auth/status` GET handler to check the Firestore `account` doc for `frozen` status, returning it in the payload: `{ loggedIn: true, uid: "...", claims: {...}, frozen: true|false }`.

### 4. Client Store & Hydration (packages/auth)
- **File:** `packages/auth/src/server/types.ts`
  - Add `frozen?: boolean` to `SessionProfile`.
- **File:** `packages/auth/src/components/AuthHandler.svelte`
  - Read `frozen` from the status API response and write it to the client `profile` nanostore.

### 5. Front-Page FAB Component (packages/threads)
- **File:** `packages/threads/src/components/FrontpageFabs.svelte` (New Svelte 5 component)
  - Read `uid` and `profile` from the reactive session store.
  - Render action button to `/create/thread` if `$uid !== null` and `$profile?.frozen` is not true.

### 6. App Integration
- **File:** `app/pelilauta/src/layouts/Page.astro`: Forward the `fab-tray` slot.
- **File:** `app/pelilauta/src/pages/index.astro`: Mount `<FrontpageFabs slot="fab-tray" client:idle />`.

---

## Task Checklist

- [ ] **Design System**
  - [ ] Add `.cn-fab-tray` and styling in `AppShell.astro`.
  - [ ] Forward `fab-tray` slot in `Page.astro`.
  - [ ] Add unit test verifying slot output in `packages/cyan/src/layouts/app-shell.test.ts`.
- [ ] **Account Schema & Server Accessor**
  - [ ] Implement `AccountSchema` and `getAccount(uid)` in `packages/auth/src/server/account.ts`.
  - [ ] Add unit tests in `packages/auth/src/server/account.test.ts`.
- [ ] **Status Oracle**
  - [ ] Update `/api/auth/status.ts` to include the resolved Firestore `frozen` status.
  - [ ] Update `/api/auth/status.test.ts` to assert correct status responses.
- [ ] **Client State**
  - [ ] Update `SessionProfile` type definition.
  - [ ] Update `AuthHandler.svelte` to propagate `frozen` to client session stores.
  - [ ] Add test coverage in `AuthHandler.test.ts`.
- [ ] **Front-Page FAB**
  - [ ] Implement `FrontpageFabs.svelte` in `packages/threads/src/components/`.
  - [ ] Mount `FrontpageFabs` on `app/pelilauta/src/pages/index.astro`.
- [ ] **E2E Validation**
  - [ ] Create `app/pelilauta/e2e/front-page-fabs.spec.ts`.
  - [ ] Verify FAB visibility for standard logged-in users.
  - [ ] Verify FAB is hidden for anonymous users.
  - [ ] Verify FAB is hidden for seeded frozen users.
- [ ] **Follow-up (out of scope for this plan)**
  - [ ] TODO: Implement server-side frozen enforcement in `/api/threads/create` — UI gating is progressive enhancement; server must also reject writes for frozen users per specs/pelilauta/session/frozen.md §Regression Guardrails "Strict Server Enforcement".
