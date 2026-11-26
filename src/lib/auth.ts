import { createAuthClient } from "better-auth/svelte";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { ACCOUNTS_URL, absolute } from "./config.ts";

// Sign-in lives in openRMS-Accounts (auth.openrms.dev; proxied at /accounts in development).
export const authClient = createAuthClient({
  // The full auth path goes in baseURL: when baseURL has a path (/accounts in dev), Better Auth's
  // client ignores basePath and would call /accounts/get-session instead of /accounts/api/auth/….
  baseURL: `${absolute(ACCOUNTS_URL)}/api/auth`,
  fetchOptions: { credentials: "include" },
  plugins: [
    inferAdditionalFields({
      user: {
        callsign: { type: "string", required: true },
        callsignVerified: { type: "boolean", required: false, input: false },
        gridsquare: { type: "string", required: false },
      },
    }),
  ],
});

export const session = authClient.useSession();
