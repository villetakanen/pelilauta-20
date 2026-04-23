import type { APIContext } from "astro";
import { vi } from "vitest";

export type MockCookies = {
  get?: ReturnType<typeof vi.fn>;
  set?: ReturnType<typeof vi.fn>;
  delete?: ReturnType<typeof vi.fn>;
};

export function makeApiContext(
  opts: {
    cookies?: MockCookies;
    body?: unknown;
    bodyRejects?: unknown;
    headers?: Record<string, string>;
  } = {},
): { ctx: APIContext; cookies: MockCookies; request: { json: ReturnType<typeof vi.fn> } } {
  const headerMap = new Map(Object.entries(opts.headers ?? {}));
  const request = {
    json: vi.fn(() =>
      opts.bodyRejects !== undefined
        ? Promise.reject(opts.bodyRejects)
        : Promise.resolve(opts.body ?? {}),
    ),
    headers: {
      get: vi.fn((key: string) => headerMap.get(key.toLowerCase()) ?? null),
    },
  };
  const cookies = opts.cookies ?? {};
  return {
    ctx: { request, cookies } as unknown as APIContext,
    cookies,
    request,
  };
}

export function cookiesWithValue(value?: string): MockCookies {
  return {
    get: vi.fn(() => (value === undefined ? undefined : { value })),
  };
}
