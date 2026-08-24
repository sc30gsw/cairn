import type { Id } from "~/../convex/_generated/dataModel";
import { NotificationTray } from "~/components/notification-tray";
import { useNotificationInbox } from "~/hooks/use-notification-inbox";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationsRead,
} from "~/hooks/use-notification-mutations";
import { runMutation } from "~/lib/run-mutation";

//* 全画面共通の通知ベル。AppShell は認証確認の後にしか描かれないので、中は常に認証済み。
export function NotificationBell() {
  const { data } = useNotificationInbox();
  const markRead = useMarkNotificationsRead();
  const markAllRead = useMarkAllNotificationsRead();

  return (
    <NotificationTray
      items={data.items}
      onMarkAllRead={() => {
        void runMutation(() => markAllRead.mutateAsync({}), {
          errorMessage: "既読にできませんでした",
        });
      }}
      onMarkRead={(notificationId: Id<"notifications">) => {
        void runMutation(() => markRead.mutateAsync({ notificationIds: [notificationId] }), {
          errorMessage: "既読にできませんでした",
        });
      }}
      unreadCount={data.unreadCount}
    />
  );
}
