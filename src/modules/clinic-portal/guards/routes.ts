// ── Clinic portal route paths ────────────────────────────────────────────────
// Client-safe constants (plain strings, no server-only imports). Kept separate
// from `require-clinic-user` so client components can reference the paths without
// pulling `next/headers` (server-only) into the client bundle.

export const CLINIC_LOGIN_PATH = "/clinic/login";
export const CLINIC_CHANGE_PASSWORD_PATH = "/clinic/change-password";
export const CLINIC_CLAIMS_PATH = "/clinic/claims";
