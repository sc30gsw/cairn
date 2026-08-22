import { createFileRoute } from "@tanstack/react-router";

import { MyPageScreen } from "~/features/my-page/components/my-page-screen";

export const Route = createFileRoute("/my-page")({
  component: MyPageRoute,
});

function MyPageRoute() {
  return <MyPageScreen />;
}
