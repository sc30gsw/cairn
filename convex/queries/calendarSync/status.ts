import { ownerQuery } from "../../lib/ownerFunctions";
import { calendarSyncOverviewValidator } from "../../lib/validators";
import {
  getOutput,
  getOutputSettings,
  listConnections,
} from "../../services/calendarSync/getConnection";
import { toConnectionDto } from "../../services/calendarSync/toConnectionDto";

export const status = ownerQuery({
  args: {},
  handler: async (ctx) => {
    const [connections, output, settings] = await Promise.all([
      listConnections(ctx, ctx.ownerId),
      getOutput(ctx, ctx.ownerId),
      getOutputSettings(ctx, ctx.ownerId),
    ]);
    return {
      connections: connections.map(toConnectionDto),
      output:
        output === null
          ? null
          : { connectionId: output.connection._id, calendarId: output.calendarId },
      outputChanging: settings?.changing === true,
    };
  },
  returns: calendarSyncOverviewValidator,
});
