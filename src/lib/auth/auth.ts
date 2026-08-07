import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { passkey } from "@better-auth/passkey";

import { db } from "@/lib/db/client";
import * as schema from "@/lib/db/schema";
import { getPublicAppUrl } from "@/lib/integrations/providers";

/**
 * Existing Penopta rows were keyed by Internode portal user ids. Keep those
 * UUIDs when the matching email signs up via Better Auth so org/project data
 * needs no rewrite. Re-run `npm run auth:dump-user-map` before prod cutover.
 */
const LEGACY_USER_IDS: Record<string, string> = {
  "sean@internode.ai": "070138ce-71f7-442c-9775-f1a17042ab7e",
  "balazs@internode.ai": "f049ad6b-74c3-46a4-bb67-ae3692374ee7",
};

/** Auth base URL — same as APP_URL unless BETTER_AUTH_URL is set explicitly. */
function authBaseUrl(): string {
  const override = process.env.BETTER_AUTH_URL?.trim();
  if (override) return override.replace(/\/+$/, "");
  return getPublicAppUrl();
}

function passkeyRpId(): string {
  const explicit = process.env.PASSKEY_RP_ID?.trim();
  if (explicit) return explicit;
  try {
    const host = new URL(authBaseUrl()).hostname;
    return host === "127.0.0.1" ? "localhost" : host;
  } catch {
    return "localhost";
  }
}

const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

export const auth = betterAuth({
  appName: "Penopta",
  baseURL: authBaseUrl(),
  secret: process.env.BETTER_AUTH_SECRET || process.env.SESSION_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
      passkey: schema.passkey,
    },
  }),
  socialProviders: {
    ...(googleClientId && googleClientSecret
      ? {
          google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret,
          },
        }
      : {}),
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const email = user.email?.trim().toLowerCase();
          const legacyId = email ? LEGACY_USER_IDS[email] : undefined;
          if (!legacyId) return { data: user };
          return { data: { ...user, id: legacyId } };
        },
      },
    },
  },
  plugins: [
    passkey({
      rpID: passkeyRpId(),
      rpName: "Penopta",
      origin: authBaseUrl(),
    }),
    nextCookies(),
  ],
});

export type AuthSession = typeof auth.$Infer.Session;
