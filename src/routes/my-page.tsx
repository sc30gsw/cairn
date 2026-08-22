import { createFileRoute } from "@tanstack/react-router";

import { OwnerGate } from "~/features/auth/components/owner-gate";
import { MyPage } from "~/features/my-page/components/my-page";

export const Route = createFileRoute("/my-page")({
  component: MyPageRoute,
});

function MyPageRoute() {
  return (
    <OwnerGate>
      <MyPage />
    </OwnerGate>
  );
}
