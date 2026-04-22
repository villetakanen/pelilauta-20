---
feature: Logging
---

# Feature: Logging

> Reverse-engineered from `.tmp/pelilauta-17/src/utils/logHelpers.ts`.

## Blueprint

### Context

Thin structured-logging wrappers over `console.*` that add emoji-prefixed log levels and type-aware formatting. Used across server (SSR) and client contexts for error reporting, warnings, and conditional debug output. v17 has ~120 call sites across API routes, Firestore accessors, and client utilities.

### Architecture

- **Source (v17):** `.tmp/pelilauta-17/src/utils/logHelpers.ts`
- **v20 target:** `packages/utils/src/log.ts` (or inline in a shared package — placement TBD by the user).
- **API:**
  - `logError(...args: unknown[])` — logs to `console.error`. Always active regardless of environment. Unwraps `ZodError` (recurses on `.issues`). Duck-types errors with a `.code` property (e.g. `FirebaseError`) to log code + message.
  - `logWarn(...args: unknown[])` — logs to `console.warn`. Silent in production unless verbose logging is enabled.
  - `logDebug(...args: unknown[])` — logs to `console.debug`. Silent in production unless verbose logging is enabled.
  - **Call-site prefixing:** callers concatenate the site identifier into the first string argument — e.g. `logError("[AuthHandler] reconciliation failed", error)`. Separate-argument prefixes (`logError("[AuthHandler]", "message", error)`) are discouraged: downstream aggregators filter on the first arg, and the split form breaks the filter.
- **Log level gating:**
  - **Production default:** only `logError` produces output. `logWarn` and `logDebug` are no-ops.
  - **Verbose mode:** when `import.meta.env.PUBLIC_LOG_VERBOSE === 'true'`, all three levels produce output. Set via `.env` per environment — e.g. `.env.development` enables it, production `.env` omits it.
  - This is a v20 deliberate change from v17, which only gated `logDebug`.
- **Dependencies:**
  - `zod` (for `ZodError` detection)
- **Constraints:**
  - All three functions accept variadic `unknown[]` — callers pass whatever they have; the logger decides how to format.
  - No `firebase/app` import — v17's `instanceof FirebaseError` is replaced by duck-typing on `.code` property, keeping the logger free of Firebase dependencies.
  - Output is always `console.*` — no external log aggregation, no structured JSON. Netlify captures stdout/stderr from SSR functions automatically.
  - All three functions are safe to call in both SSR and client contexts (no server-only imports at the module level).

## Contract

### Definition of Done

- [ ] `logError`, `logWarn`, and `logDebug` are exported from the target module.
- [ ] `logError` always produces output, regardless of environment or env vars.
- [ ] `logError` recurses into `ZodError.issues` rather than printing the opaque wrapper.
- [ ] `logError` duck-types errors with a `.code` property to log code + message (no Firebase import).
- [ ] `logWarn` and `logDebug` are silent when `PUBLIC_LOG_VERBOSE` is unset or not `'true'`.
- [ ] `logWarn` and `logDebug` produce output when `PUBLIC_LOG_VERBOSE === 'true'`.
- [ ] No `firebase/app` import in the module.

### Regression Guardrails

- `logError` must never throw — it is called from catch blocks; an error in the logger would mask the original error.
- `logWarn` and `logDebug` must default to silent (no output) in production.
- `logError` must always emit — it is never gated on env vars.

### Testing Scenarios

#### Scenario: logError unwraps ZodError

```gherkin
Given a ZodError with 2 issues
When logError is called with that error
Then console.error is called with the issues array (not the ZodError wrapper)
```

- **Vitest Unit Test:** `packages/utils/src/log.test.ts` (or co-located with the target module)

#### Scenario: logWarn and logDebug are silent in production

```gherkin
Given PUBLIC_LOG_VERBOSE is not set
When logWarn is called
Then console.warn is not called

Given PUBLIC_LOG_VERBOSE is not set
When logDebug is called
Then console.debug is not called
```

- **Vitest Unit Test:** `packages/utils/src/log.test.ts`

#### Scenario: logWarn and logDebug produce output in verbose mode

```gherkin
Given PUBLIC_LOG_VERBOSE is 'true'
When logWarn is called with "test warning"
Then console.warn is called with the provided arguments

Given PUBLIC_LOG_VERBOSE is 'true'
When logDebug is called with "test debug"
Then console.debug is called with the provided arguments
```

- **Vitest Unit Test:** `packages/utils/src/log.test.ts`

#### Scenario: logError formats errors with a .code property

```gherkin
Given an error object with { code: 'auth/invalid-token', message: 'Token expired' }
When logError is called with that error
Then console.error is called with the code and message (not the raw object)
```

- **Vitest Unit Test:** `packages/utils/src/log.test.ts`
