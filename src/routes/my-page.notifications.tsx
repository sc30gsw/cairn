import { createFileRoute } from "@tanstack/react-router";

import { MyPageNotifications } from "~/features/my-page/components/my-page-notifications";

export const Route = createFileRoute("/my-page/notifications")({
  component: MyPageNotifications,
});
