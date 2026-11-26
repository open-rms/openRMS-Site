import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import adapter from "@sveltejs/adapter-static";
import { defineConfig } from "vite";

// The Site is a static single-page app: a client of the Directory API and of openRMS-Accounts.
// In development Vite proxies both, so the browser stays on one origin: /api → Directory,
// /accounts/* → Accounts (prefix stripped; both services have /api/v1/me and /api/v1/admin).
const env = (globalThis as any).process?.env ?? {};
const API = env.DIRECTORY_URL ?? "http://localhost:8787";
const ACCOUNTS = env.ACCOUNTS_URL ?? "http://localhost:8789";

export default defineConfig({
  plugins: [tailwindcss(), sveltekit({ adapter: adapter({ fallback: "index.html" }) })],
  server: {
    port: 5173,
    proxy: {
      "/accounts": { target: ACCOUNTS, changeOrigin: false, rewrite: (p) => p.replace(/^\/accounts/, "") },
      "/api": { target: API, changeOrigin: false },
      "/gateway/status.json": API,
      "/export": API,
      "/docs": API,
    },
  },
});
