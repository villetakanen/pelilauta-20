// Stub for the virtual `astro:middleware` module so vitest can resolve the
// import at transform time. `vi.mock("astro:middleware", ...)` in test files
// replaces behavior at runtime; this just needs to exist.
export const defineMiddleware = <T>(fn: T): T => fn;
