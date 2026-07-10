// Deploy-time sub-app flags. See specs/pelilauta/app-flags/spec.md.
//
// Default-on: only the literal string "false" disables an app, so a typo in
// a flag value fails open, never dark. Flags vary per deployment, never per
// request or viewer — evaluation is SSR-only and cache-shareable.

export type AppFlag = "threads" | "sites" | "tags" | "profiles";

export function isAppEnabled(app: AppFlag): boolean {
  return import.meta.env[`PUBLIC_app_${app}`] !== "false";
}
