import { createAuthMiddleware, getOAuthState } from "better-auth/api";
import type { BetterAuthOptions } from "better-auth/minimal";
import { google } from "better-auth/social-providers";

type GoogleOptions = Parameters<typeof google>[0];

export type CalendarGoogleAuthorization = {
  authorize: (args: {
    googleAccountId: string;
    ownerId: string;
    requestId: string;
  }) => Promise<boolean>;
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
    if (path === "/link-social") {
      return null;
    }
    const state = await getOAuthState();
    if (state?.link) {
      if (
        typeof state.calendarRequestId !== "string" ||
        !(await authorization.authorize({
          googleAccountId,
          ownerId: state.link.userId,
          requestId: state.calendarRequestId,
        }))
      ) {
        return null;
      }
      return profile;
    }
    if (state?.calendarRequestId || !(await authorization.canSignIn(googleAccountId))) {
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
