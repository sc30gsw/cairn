"use node";

import { Result } from "better-result";
import { v } from "convex/values";

import { internal } from "../../_generated/api";
import {
  CALENDAR_SYNC_NEEDS_REAUTH_MESSAGE,
  CALENDAR_SYNC_SCOPE_MISSING_MESSAGE,
  GOOGLE_CALENDAR_SCOPES,
} from "../../lib/calendarSync";
import { ValidationFailedError } from "../../lib/errors";
import { getGoogleAccessToken, listGoogleAccounts } from "../../lib/googleAccessToken";
import {
  calendarSummaryOf,
  defaultVisibleCalendarIds,
  listCalendars,
} from "../../lib/googleCalendar";
import { ownerAction, throwDomain } from "../../lib/ownerFunctions";
import { runOwnerSync } from "../../services/calendarSync/runOwnerSync";

//? マイページ「Google カレンダーと連携」。linkSocial でカレンダー権限を付けた Google アカウントを探し、
//? カレンダー一覧を写して接続を作り、その場で最初の同期まで行う
export const connect = ownerAction({
  args: {},
  handler: async (ctx) => {
    const accounts = await listGoogleAccounts(ctx);
    const account = accounts.find((candidate) =>
      GOOGLE_CALENDAR_SCOPES.every((scope) => candidate.scopes.includes(scope)),
    );
    if (account === undefined) {
      throwDomain(new ValidationFailedError({ message: CALENDAR_SYNC_SCOPE_MISSING_MESSAGE }));
    }
    const token = await getGoogleAccessToken(ctx, {
      accountId: account.accountId,
      userId: ctx.ownerId,
    });
    if (Result.isError(token)) {
      throwDomain(new ValidationFailedError({ message: CALENDAR_SYNC_NEEDS_REAUTH_MESSAGE }));
    }
    const calendars = await listCalendars({ accessToken: token.value });
    if (Result.isError(calendars)) {
      throwDomain(new ValidationFailedError({ message: calendars.error.message }));
    }
    const primary = calendars.value.find((entry) => entry.primary === true);
    await ctx.runMutation(internal.mutations.calendarSync.upsertConnection.upsertConnection, {
      calendars: calendars.value.map(calendarSummaryOf),
      defaultVisibleCalendarIds: defaultVisibleCalendarIds(calendars.value),
      googleAccountId: account.accountId,
      googleEmail: primary?.id ?? null,
      ownerId: ctx.ownerId,
    });
    await runOwnerSync(ctx, ctx.ownerId);
    return null;
  },
  returns: v.null(),
});
