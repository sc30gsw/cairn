import { ownerQuery } from "../../lib/ownerFunctions";
import { notificationPageValidator } from "../../lib/validators";
import { list as listNotifications } from "../../services/notifications/list";

//? 引数を取らない(CVX-14)。未読は readAt の有無だけで決まり、相対時刻は画面が _creationTime から作る。
export const list = ownerQuery({
  args: {},
  handler: async (ctx) => listNotifications(ctx, ctx.ownerId),
  returns: notificationPageValidator,
});
