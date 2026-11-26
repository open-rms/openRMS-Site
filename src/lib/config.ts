// Where the Site's services live. Development: both are proxied by Vite (vite.config.ts), so
// the browser stays on one origin. Production: set VITE_ACCOUNTS_URL=https://auth.openrms.dev,
// VITE_DIRECTORY_URL=https://directory.openrms.dev and VITE_DIRECTORY_AUDIENCE to the same.
const env = import.meta.env as Record<string, string | undefined>;
export const ACCOUNTS_URL = env.VITE_ACCOUNTS_URL ?? "/accounts";
export const DIRECTORY_URL = env.VITE_DIRECTORY_URL ?? "";
export const DIRECTORY_AUDIENCE = env.VITE_DIRECTORY_AUDIENCE ?? "http://localhost:8787";

/** Absolute form of a possibly relative base, for libraries that need a full URL. */
export const absolute = (base: string) => (typeof location !== "undefined" ? new URL(base || "/", location.origin).href.replace(/\/$/, "") : base);

/** Browser-facing Accounts pages (a separate app): http://localhost:8789 in dev, https://auth.openrms.dev in prod. */
export const ACCOUNTS_UI_URL = env.VITE_ACCOUNTS_UI_URL ?? "http://localhost:8789";

/**
 * Link to an Accounts page (login, signup, account, clubs, link) that returns the user to
 * `next` (default: the current page) afterwards. Accounts only honours trusted origins.
 */
export function accountsPage(path: string, next?: string, extra: Record<string, string> = {}): string {
  const back = next ?? (typeof location !== "undefined" ? location.href : "");
  const q = new URLSearchParams({ ...(back ? { next: back } : {}), ...extra });
  return `${ACCOUNTS_UI_URL}${path}${q.size ? `?${q}` : ""}`;
}

/** Leave the Site for an Accounts page (replace: keeps the redirect page out of history). */
export function goToAccounts(path: string, next?: string, extra: Record<string, string> = {}) {
  location.replace(accountsPage(path, next, extra));
}
