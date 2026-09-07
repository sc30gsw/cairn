import { createAuthMiddleware, getOAuthState } from "better-auth/api";
import type { BetterAuthOptions } from "better-auth/minimal";
import { google } from "better-auth/social-providers";
import type { FunctionArgs } from "convex/server";

import type { internal } from "../_generated/api";
import { CALENDAR_REQUEST_ID_KEY } from "./calendarSync";

type GoogleOptions = Parameters<typeof google>[0];

export type CalendarGoogleAuthorization = {
  authorize: (
    args: FunctionArgs<typeof internal.mutations.calendarAuth.authorize.authorize>,
  ) => Promise<boolean>;
  canSignIn: (googleAccountId: string) => Promise<boolean>;
};

export function calendarGoogleAuth(
  options: GoogleOptions,
  authorization: CalendarGoogleAuthorization,
) {
  const standardGoogle = google(options);
  const getUserInfo = async (
    tokens: Parameters<typeof standardGoogle.getUserInfo>[0],
    path: string,
    attempt: { googleAccountId?: string },
  ) => {
    const profile = await standardGoogle.getUserInfo(tokens);
    if (!profile?.user.id) {
      return null;
    }
    const googleAccountId = String(profile.user.id);
    //? /link-social は idToken を直接渡す連携で、OAuth state（所有者と一回限りの要求）を経由しない。
    //? null を返すと Better Auth が連携を拒否するので、カレンダー接続は常に callback 経由に限定する
    if (path === "/link-social") {
      return null;
    }
    const state = await getOAuthState();
    if (state?.link) {
      const requestId = state[CALENDAR_REQUEST_ID_KEY];
      if (
        typeof requestId !== "string" ||
        !(await authorization.authorize({
          googleAccountId,
          ownerId: state.link.userId,
          requestId,
        }))
      ) {
        return null;
      }
      return profile;
    }
    if (state?.[CALENDAR_REQUEST_ID_KEY] || !(await authorization.canSignIn(googleAccountId))) {
      return null;
    }
    attempt.googleAccountId = googleAccountId;
    return profile;
  };

  return {
    databaseHooks: {
      session: {
        create: {
          before: async (_session, ctx) => {
            const attempt: unknown =
              ctx?.context && "calendarGoogleAttempt" in ctx.context
                ? ctx.context.calendarGoogleAttempt
                : undefined;
            if (
              typeof attempt === "object" &&
              attempt !== null &&
              "googleAccountId" in attempt &&
              typeof attempt.googleAccountId === "string"
            ) {
              return await authorization.canSignIn(attempt.googleAccountId);
            }
            return true;
          },
        },
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        const attempt: { googleAccountId?: string } = {};
        return {
          context: {
            context: {
              calendarGoogleAttempt: attempt,
              socialProviders: ctx.context.socialProviders.map((provider) =>
                provider.id === "google"
                  ? {
                      ...provider,
                      getUserInfo:
                        ctx.path === "/account-info"
                          ? standardGoogle.getUserInfo
                          : (tokens: Parameters<typeof standardGoogle.getUserInfo>[0]) =>
                              getUserInfo(tokens, ctx.path, attempt),
                    }
                  : provider,
              ),
            },
          },
        };
      }),
    },
    socialProviders: { google: options },
  } satisfies Pick<BetterAuthOptions, "hooks" | "socialProviders" | "databaseHooks">;
}
