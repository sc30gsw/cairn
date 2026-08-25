import { passkey } from "@better-auth/passkey";
import { createClient } from "@convex-dev/better-auth";
import type { GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { isActionCtx, isQueryCtx } from "@convex-dev/better-auth/utils";
import { betterAuth, type BetterAuthOptions } from "better-auth/minimal";
import { username } from "better-auth/plugins/username";

import { components } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";
import authSchema from "./betterAuth/schema";
import {
  PASSWORD_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
} from "./lib/authFields";
import {
  notionOAuthConfigured,
  requireEnv,
  signUpDisabledFromEnv,
  trustedOriginsFromEnv,
} from "./lib/env";

const DEFAULT_SITE_URL = "http://localhost:3000";

function passkeyRpId(siteUrl: string | undefined): string {
  const candidate = siteUrl ?? DEFAULT_SITE_URL;
  if (typeof URL.canParse === "function" && !URL.canParse(candidate)) {
    return new URL(DEFAULT_SITE_URL).hostname;
  }
  try {
    return new URL(candidate).hostname;
  } catch {
    return new URL(DEFAULT_SITE_URL).hostname;
  }
}

export const authComponent = createClient<DataModel, typeof authSchema>(components.betterAuth, {
  local: { schema: authSchema },
});

const isLiveConvexCtx = (ctx: GenericCtx<DataModel>) => isQueryCtx(ctx) || isActionCtx(ctx);

export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
  const siteUrl = process.env.SITE_URL;
  const notionAuth = notionOAuthConfigured();
  const signUpDisabled = signUpDisabledFromEnv();
  return {
    account: {
      encryptOAuthTokens: notionAuth,
    },
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      disableSignUp: signUpDisabled,
      enabled: true,
      minPasswordLength: PASSWORD_MIN_LENGTH,
    },
    plugins: [
      convex({ authConfig }),
      username({
        maxUsernameLength: USERNAME_MAX_LENGTH,
        minUsernameLength: USERNAME_MIN_LENGTH,
        usernameValidator: (candidate) => USERNAME_PATTERN.test(candidate),
      }),
      passkey({
        rpID: passkeyRpId(siteUrl),
        rpName: "Cairn",
      }),
    ],
    rateLimit: {
      customRules: {
        "/sign-in/email": { max: 5, window: 60 },
        "/sign-up/email": { max: 3, window: 60 },
      },
      enabled: true,
      storage: "database",
    },
    socialProviders: notionAuth
      ? {
          notion: {
            clientId: process.env.NOTION_CLIENT_ID ?? "",
            clientSecret: process.env.NOTION_CLIENT_SECRET ?? "",
            // emailAndPassword.disableSignUp だけでは OAuth コールバックの暗黙サインアップは
            // 止まらない(better-auth 1.6.28: api/routes/callback.mjs は
            // provider.options?.disableSignUp だけを見る)。プロバイダ単位で明示的に渡す。
            disableSignUp: signUpDisabled,
          },
        }
      : undefined,
    trustedOrigins: trustedOriginsFromEnv(siteUrl),
  } satisfies BetterAuthOptions;
};

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  if (isLiveConvexCtx(ctx)) {
    requireEnv("BETTER_AUTH_SECRET");
    requireEnv("SITE_URL");
  }
  return betterAuth(createAuthOptions(ctx));
};
