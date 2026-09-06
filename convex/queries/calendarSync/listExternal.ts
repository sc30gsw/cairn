import { v } from "convex/values";

import { ownerQuery } from "../../lib/ownerFunctions";
import {
  boardScheduleViewValidator,
  externalCalendarEventDtoValidator,
} from "../../lib/validators";
import { listExternal as listExternalEvents } from "../../services/calendarSync/externalEvents";

export const listExternal = ownerQuery({
  args: { anchorDateJst: v.string(), view: boardScheduleViewValidator },
  handler: async (ctx, args) => listExternalEvents(ctx, ctx.ownerId, args),
  returns: v.array(externalCalendarEventDtoValidator),
});
