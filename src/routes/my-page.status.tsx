import { createFileRoute } from "@tanstack/react-router";

import { MyPageStatus } from "~/features/my-page/components/my-page-status";

export const Route = createFileRoute("/my-page/status")({
  component: MyPageStatus,
});
