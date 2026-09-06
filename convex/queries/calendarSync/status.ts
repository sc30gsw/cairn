import { ownerQuery } from "../../lib/ownerFunctions";
import { calendarConnectionDtoValidator } from "../../lib/validators";
import { getConnection } from "../../services/calendarSync/getConnection";
import { toConnectionDto } from "../../services/calendarSync/toConnectionDto";

export const status = ownerQuery({
  args: {},
  handler: async (ctx) => toConnectionDto(await getConnection(ctx, ctx.ownerId)),
  returns: calendarConnectionDtoValidator,
});
