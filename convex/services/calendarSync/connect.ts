import { Result } from "better-result";

import { internal } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";
import {
  CALENDAR_SYNC_NEEDS_REAUTH_MESSAGE,
  CALENDAR_SYNC_PRIMARY_MISSING_MESSAGE,
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
import { todayJst } from "../../lib/jst";
import { throwDomain } from "../../lib/ownerFunctions";
import type { OwnerSyncOutcome } from "../../lib/validators";
import { deleteLinkedGoogleEvents } from "./deleteLinkedGoogleEvents";
import { runOwnerSync } from "./runOwnerSync";

export async function connect(ctx: ActionCtx, ownerId: string): Promise<OwnerSyncOutcome> {
  const accounts = await listGoogleAccounts(ctx);
  const account = accounts.find((candidate) =>
    GOOGLE_CALENDAR_SCOPES.every((scope) => candidate.scopes.includes(scope)),
  );
  if (account === undefined) {
    throwDomain(new ValidationFailedError({ message: CALENDAR_SYNC_SCOPE_MISSING_MESSAGE }));
  }
  const token = await getGoogleAccessToken(ctx, { accountId: account.accountId, userId: ownerId });
  if (Result.isError(token)) {
    throwDomain(new ValidationFailedError({ message: CALENDAR_SYNC_NEEDS_REAUTH_MESSAGE }));
  }
  const calendars = await listCalendars({ accessToken: token.value });
  if (Result.isError(calendars)) {
    throwDomain(new ValidationFailedError({ message: calendars.error.message }));
  }
  const primary = calendars.value.find((entry) => entry.primary === true);
  if (primary === undefined) {
    throwDomain(new ValidationFailedError({ message: CALENDAR_SYNC_PRIMARY_MISSING_MESSAGE }));
  }

  const previous = await ctx.runQuery(internal.queries.calendarSync.syncPlan.syncPlan, {
    ownerId,
    todayJst: todayJst(),
  });
  if (previous !== null && previous.googleAccountId !== account.accountId) {
    await deleteLinkedGoogleEvents(ctx, ownerId, previous);
  }

  await ctx.runMutation(internal.mutations.calendarSync.upsertConnection.upsertConnection, {
    calendars: calendars.value.map(calendarSummaryOf),
    defaultVisibleCalendarIds: defaultVisibleCalendarIds(calendars.value),
    googleAccountId: account.accountId,
    googleEmail: primary.id,
    ownerId,
  });
  return runOwnerSync(ctx, ownerId);
}
