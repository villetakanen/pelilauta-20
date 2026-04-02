# Scaffolding Plan — Pelilauta 20.0.0-alpha.1

## Decisions

- Monorepo layout, Vite aliases for cross-package imports (no workspace: protocol)
- Single version `20.0.0-alpha.1` in root `package.json`
- Per-app `package.json` for dependency clarity
- Stack: Astro + Svelte 5 (Runes) + Firebase + Nanostores + Zod + Biome
- Testing: Vitest (unit, colocated) + Playwright (e2e, per-app)
- No Lit

## Directory Structure

```
pelilauta-20/
├── package.json                    # Version 20.0.0-alpha.1, shared devDeps
├── biome.json                      # Root Biome config
├── tsconfig.json                   # Root TS config with path aliases
├── .gitignore
├── lefthook.yml                    # Git hooks (pre-commit, commit-msg)
├── commitlint.config.js            # Conventional Commits config
│
├── app/
│   ├── pelilauta/                  # Main platform
│   │   ├── package.json            # App-specific deps (firebase, etc.)
│   │   ├── astro.config.mjs        # Astro config with Vite aliases
│   │   ├── vitest.config.ts
│   │   ├── playwright.config.ts
│   │   ├── tsconfig.json           # Extends root, adds app-specific paths
│   │   ├── e2e/                    # Playwright e2e tests
│   │   └── src/
│   │       ├── pages/              # Astro pages
│   │       ├── firebase/           # Firebase client + server utilities
│   │       ├── stores/             # Nanostores + colocated *.test.ts
│   │       ├── schemas/            # Zod schemas + colocated *.test.ts
│   │       └── utils/              # App-specific utilities + colocated *.test.ts
│   │
│   └── cyan-ds/                    # Design system playground
│       ├── package.json            # App-specific deps
│       ├── astro.config.mjs        # Astro config with Vite aliases
│       ├── playwright.config.ts
│       ├── tsconfig.json           # Extends root
│       ├── e2e/                    # Playwright e2e tests for DS components
│       └── src/
│           └── pages/              # DS component demos/docs
│
├── packages/
│   ├── cyan/                       # Design system
│   │   ├── vitest.config.ts
│   │   ├── src/
│   │   │   ├── tokens/             # CSS custom properties, design tokens
│   │   │   ├── fonts/              # Font definitions
│   │   │   ├── components/         # Svelte UI components + colocated *.test.ts
│   │   │   └── index.ts            # Public API
│   │   └── tsconfig.json
│   │
│   └── shell/                      # Shared app chrome
│       ├── vitest.config.ts
│       ├── src/
│       │   ├── layouts/            # Astro/Svelte layout components + colocated *.test.ts
│       │   ├── nav/                # Navigation components + colocated *.test.ts
│       │   └── index.ts            # Public API
│       └── tsconfig.json
```

## Steps

### 1. Root configuration

- [ ] `package.json` — name, version `20.0.0-alpha.1`, shared devDeps (typescript, biome, svelte, astro, vitest, playwright)
- [ ] `biome.json` — 2-space indent, shared rules
- [ ] `tsconfig.json` — base config with shared compiler options
- [ ] `.gitignore` — node_modules, dist, .env, .astro
- [ ] `lefthook.yml` — pre-commit (biome check staged files), commit-msg (commitlint)
- [ ] `commitlint.config.js` — Conventional Commits enforcement

### 2. packages/cyan

- [ ] `vitest.config.ts`
- [ ] `src/tokens/` — CSS custom properties (colors, spacing, typography, radii)
- [ ] `src/fonts/` — font-face definitions
- [ ] `src/components/` — starter Svelte component (e.g., Button) with colocated `Button.test.ts`
- [ ] `src/index.ts` — barrel export

### 3. packages/shell

- [ ] `vitest.config.ts`
- [ ] `src/layouts/` — base layout component (Astro)
- [ ] `src/nav/` — placeholder navigation component (Svelte)
- [ ] `src/index.ts` — barrel export

### 4. app/pelilauta

- [ ] `package.json` — app deps (firebase, nanostores, zod)
- [ ] `astro.config.mjs` — Svelte integration, Vite aliases for `@cyan/*` and `@shell/*`
- [ ] `vitest.config.ts`
- [ ] `playwright.config.ts`
- [ ] `tsconfig.json` — extends root, alias paths
- [ ] `src/pages/index.astro` — minimal landing page using shell layout + cyan components
- [ ] `e2e/` — placeholder Playwright test
- [ ] `src/firebase/` — placeholder client/server setup
- [ ] `src/stores/` — placeholder session store
- [ ] `src/schemas/` — placeholder

### 5. app/cyan-ds

- [ ] `package.json` — app deps
- [ ] `astro.config.mjs` — Svelte integration, Vite aliases
- [ ] `playwright.config.ts`
- [ ] `tsconfig.json` — extends root, alias paths
- [ ] `src/pages/index.astro` — DS landing page using shell layout, showcasing cyan components
- [ ] `e2e/` — placeholder Playwright test

### 6. Verify

- [ ] `pnpm install` from root
- [ ] `pnpm dev` starts pelilauta app and renders
- [ ] `pnpm dev:ds` starts cyan-ds app and renders
- [ ] Vite aliases resolve correctly in both apps
- [ ] `pnpm test` runs vitest across all packages/apps
- [ ] `pnpm test:e2e` runs playwright for both apps
- [ ] Biome check passes
