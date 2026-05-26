---
feature: Frozen Account Checking
status: draft
maturity: design
last_major_review: 2026-05-20
parent_spec: ./spec.md
---

# Feature: Frozen Account Checking

## Blueprint

### Context
A user account on Pelilauta can be "frozen" by administrators to restrict their access to posting new content (like threads and replies) while allowing them to continue reading existing content. This spec defines the mechanism to check the account's `frozen` status on the server and propagate it to the client session so the UI can reactively adapt (e.g. by hiding Floating Action Buttons that create content).

### Architecture
- **Data Models:**
  - **Account Doc:** Lives at `account/{uid}` in Firestore. Has schema `AccountSchema` with `frozen: boolean` (optional, defaults to `false`).
- **Server Accessors:**
  - `getAccount(uid: string): Promise<Account | null>` inside `@pelilauta/auth/server`.
- **Session Oracle Integration:**
  - The endpoint `/api/auth/status` is updated to read the `account` document for the authenticated user and append the `frozen` flag to the returned payload.
- **Client Session Store:**
  - `@pelilauta/auth/client`'s `profile` store or custom session stores are updated to hold the `frozen` boolean.
  - Svelte components (like the Frontpage FAB) reactively bind to this value.

### API Contracts
- `/api/auth/status` returns:
  ```json
  {
    "loggedIn": true,
    "uid": "...",
    "claims": { ... },
    "frozen": true
  }
  ```

## Contract

### Definition of Done
- [ ] `AccountSchema` validates the `account/{uid}` document structures, supporting `frozen` as an optional boolean defaulting to `false`.
- [ ] `/api/auth/status` resolves the user's `frozen` state from Firestore and includes `frozen` in the JSON response.
- [ ] `AuthHandler` syncs the `frozen` status from the status check to the client-side session store.
- [ ] Svelte 5 FAB components hide themselves if the user's `frozen` status is `true`.
- [ ] When `Astro.locals.uid` is null at SSR time, the FAB tray renders a server-side `<a href="/login?next=...">` login CTA in place of the authenticated FAB island. The Svelte FAB component is NOT mounted on anonymous renders (preserves session/spec.md §Anonymous surfaces ship zero CSR for auth).

### Regression Guardrails
- **Fail-Safe Visibility:** If the user's session state is loading or auth status is indeterminate, write actions/FABs must remain hidden until status is authoritatively confirmed.
- **Strict Server Enforcement:** UI gating of FABs is a progressive enhancement. The server-side API endpoints (e.g. `/api/threads/create`) must still perform the authoritative Firestore check and reject writes if the user is frozen.

## Testing Scenarios

#### Scenario: Status oracle returns frozen status for standard users
```gherkin
Given a GET to "/api/auth/status" for a user whose Firestore account has frozen set to true
When the route handler runs
Then the response status is 200
And the response body is { loggedIn: true, uid, claims, frozen: true }
```

#### Scenario: Status oracle returns frozen=false when account document is missing
```gherkin
Given a GET to "/api/auth/status" for a user who has no Firestore account document
When the route handler runs
Then the response status is 200
And the response body is { loggedIn: true, uid, claims, frozen: false }
```

#### Scenario: Client session store reflects frozen status after status check
```gherkin
Given the AuthHandler reconciles with a response indicating frozen: true
When the session store is updated
Then the client-side session store's profile is updated with frozen = true
```

#### Scenario: Anonymous viewer sees login CTA in FAB tray
```gherkin
Given an anonymous viewer requests the front page
When the page is rendered
Then the fab-tray contains a server-rendered <a href="/login?next=/create/thread"> link
And the FrontpageFabs Svelte island is not present in the SSR output
```
