# Pelilauta 20

> 20.0.0-alpha.1

A role-playing games community platform built with modern web technologies. Pelilauta provides a space for RPG enthusiasts to create sites, share content, engage in discussions, and build gaming communities.

## Monorepo Structure

Monorepo layout for code organization and LLM/agent context engineering. Packages are linked via **Vite aliases**, not pnpm workspace protocol — no monorepo build tooling required.

```
pelilauta-20/
├── app/
│   ├── pelilauta/          # Main Astro application (SSR + Svelte 5)
│   └── cyan-ds/            # Design system documentation/playground
├── packages/
│   ├── cyan/               # Cyan design system (tokens, components, styles)
│   └── ...                 # Additional shared libraries
└── package.json
```

### Apps

- **`app/pelilauta`** — The main platform. Astro with SSR, Svelte 5 (Runes mode) for interactivity, Firebase backend.
- **`app/cyan-ds`** — Design system documentation, component playground, and visual testing.

### Packages

- **`packages/cyan`** — The Cyan design system: tokens, base styles, and shared UI components. Pure CSS/Svelte.
- Additional packages for shared schemas, utilities, Firebase abstractions, etc. as needed.

### Package Linking

Packages are resolved at build time via Vite/Astro aliases, not workspace dependencies:

```ts
// vite.config / astro.config — alias example
resolve: {
  alias: {
    '@cyan': path.resolve(__dirname, '../../packages/cyan/src'),
  }
}
```

This keeps each directory self-contained for LLM context while avoiding monorepo tooling complexity.

## Tech Stack

- **Framework**: [Astro](https://astro.build/) with SSR
- **UI**: [Svelte 5](https://svelte.dev/) (Runes mode)
- **Design System**: Cyan (custom, in `packages/cyan`)
- **Backend**: [Google Firebase](https://firebase.google.com/) (Auth, Firestore, Storage)
- **State Management**: [Nanostores](https://github.com/nanostores/nanostores)
- **Validation**: [Zod](https://zod.dev/) schemas
- **Language**: TypeScript throughout
- **Monorepo**: pnpm + Vite aliases (no workspace linking)
- **Unit Testing**: [Vitest](https://vitest.dev/) (colocated `*.test.ts` files)
- **E2E Testing**: [Playwright](https://playwright.dev/) (per-app `e2e/` directories)
- **Linting**: [Biome](https://biomejs.dev/)
- **Git Hooks**: [Lefthook](https://github.com/evilmartians/lefthook) + [commitlint](https://commitlint.js.org/) (Conventional Commits)

## Development

### Prerequisites
- Node.js 20+
- pnpm
- Firebase project with Auth, Firestore, and Storage enabled

### Setup

```bash
pnpm install
```

### Key Commands

```bash
pnpm dev          # Start pelilauta app (dev mode)
pnpm dev:ds       # Start cyan-ds app (dev mode)
pnpm build        # Build both apps for production
pnpm test         # Run unit tests (Vitest, all packages + apps)
pnpm test:e2e     # Run e2e tests (Playwright, both apps)
pnpm check        # Lint and format (Biome)
```

## Environment Variables

Create a `.env.development` at the repo root (loaded by `@pelilauta/firebase/config-server` via dotenv). Env var names are inherited verbatim from pelilauta-17 so the same Firebase projects can be reused without re-provisioning. See `specs/pelilauta/firebase/spec.md` §Environment Variables for the authoritative list and the `.env.example` file for a copy-paste template.

```env
# Firebase client config — safe to expose in the browser bundle
PUBLIC_apiKey=
PUBLIC_authDomain=
PUBLIC_databaseURL=
PUBLIC_projectId=
PUBLIC_storageBucket=
PUBLIC_messagingSenderId=
PUBLIC_appId=
PUBLIC_measurementId=

# Service-account fields with public values (invariant Google endpoints / identifiers)
PUBLIC_universe_domain=
PUBLIC_auth_uri=
PUBLIC_token_uri=
PUBLIC_auth_provider_x509_cert_url=

# Firebase Admin SDK service account — server-side only
SECRET_private_key_id=
SECRET_private_key=
SECRET_client_email=
SECRET_client_id=
SECRET_client_x509_cert_url=

# E2E test fixture secret — dev-only, MUST be unset in production
SECRET_e2e_seed_secret=dev-only-not-a-real-secret
```

**SECRET_ is a strict sensitivity classification in v20** — any `SECRET_*` value appearing in the published client bundle fails the Netlify secrets scan. v17's original naming mislabeled several public-valued vars as `SECRET_`; v20 corrects this (`auth_uri`, `token_uri`, `auth_provider_x509_cert_url`, `universe_domain` → `PUBLIC_`). `client_x509_cert_url` stays `SECRET_` because its value contains the service-account email (same identifier as `SECRET_client_email`).

## Core Features

- **Sites & Communities** — Create and manage RPG gaming sites, invite players, manage permissions
- **Discussions** — Threaded discussions with real-time updates, replies, notifications, reactions
- **Content Management** — Pages with revision history, file uploads, handouts
- **Social** — User profiles, notification system, activity feeds, site discovery
- **Integration** — Bluesky social media, external link previews

## Code Patterns

### Svelte 5 Components (Runes Mode)

```svelte
<script lang="ts">
interface Props {
  title: string;
  active?: boolean;
}

const { title, active = false }: Props = $props();
const isVisible = $state(false);
const buttonText = $derived(isVisible ? 'Hide' : 'Show');
</script>
```

### Firebase Patterns

```ts
// Client-side (dynamic imports)
const { doc, getDoc } = await import('firebase/firestore');
const { db } = await import('@firebase/client');

// Server-side (static imports)
import { serverDB } from '@firebase/server';
```

## Contributing

1. Use proper TypeScript types
2. Validate data with Zod schemas
3. Follow 2-space indentation (Biome)
4. Use Vite alias imports for packages (e.g., `@cyan/tokens`)
5. Follow Conventional Commits format

## License

MIT
