import type { Doc } from "../../_generated/dataModel";
import type { NotificationDto } from "../../lib/validators";

export function toNotificationDto(doc: Doc<"notifications">): NotificationDto {
  return {
    _creationTime: doc._creationTime,
    _id: doc._id,
    payload: doc.payload,
    read: doc.readAt !== undefined,
  };
}
