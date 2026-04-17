# Login MVP Implementation Plan

This plan details the steps to implement the foundational authentication flow for Pelilauta 20.

## 1. Nanostores Session Store
Scaffold `app/pelilauta/src/stores/session.ts` to manage reactive auth state.
- `authUser`: Firebase User object (atom)
- `uid`: Current UID (persistent atom)
- `sessionState`: 'initial' | 'loading' | 'active' | 'error'

## 2. API: Session Route
Implement `app/pelilauta/src/pages/api/auth/session.ts`.
- **POST**: Receives Firebase ID token, verifies it via `firebase-admin`, and sets a `session` cookie.
- **DELETE**: Clears the `session` cookie.
- **GET**: Verifies the `session` cookie and returns user info.

## 3. Auth UI Components
- **`CnLoginButton.svelte`**: A reusable button component that triggers the Google Auth flow using `@pelilauta/firebase/client`.
- **`AuthHandler.svelte`**: A Headless component that lives in the `AppShell` to sync the Firebase client state with the server session.

## 4. Login Page
Implement `app/pelilauta/src/pages/login.astro`.
- Simple centered layout with the `CnLoginButton`.
- Messaging for the user.

## 5. AppShell/AppBar Integration
Update `AppShell` or `AppBar` to show:
- Profile dropdown/link if logged in.
- "Login" link if not.

## 6. Testing
- Playwright E2E tests for the login/logout flow.
- Vitest for the Session API logic.
