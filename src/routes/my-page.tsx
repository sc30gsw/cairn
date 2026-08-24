import { Tabs } from "@mantine/core";
import { createFileRoute, Outlet, useLocation, useNavigate } from "@tanstack/react-router";

import { PageTitle } from "~/components/page-title";
import { OwnerGate } from "~/features/auth/components/owner-gate";
import { MyPagePasskeyReprompt } from "~/features/my-page/components/my-page-passkey-reprompt";

import tabBarClasses from "~/components/pills-tab-bar.module.css";

const MY_PAGE_TABS = [
  { label: "アカウント", to: "/my-page", value: "account" },
  { label: "状況", to: "/my-page/status", value: "status" },
  { label: "通知", to: "/my-page/notifications", value: "notifications" },
] as const;

export const Route = createFileRoute("/my-page")({
  component: MyPageLayout,
});

function activeTabValue(pathname: string) {
  if (pathname.startsWith("/my-page/status")) {
    return "status";
  }
  if (pathname.startsWith("/my-page/notifications")) {
    return "notifications";
  }
  return "account";
}

function MyPageLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <OwnerGate>
      <PageTitle mb="md">マイページ</PageTitle>
      <Tabs
        mb="md"
        onChange={(value) => {
          const tab = MY_PAGE_TABS.find((entry) => entry.value === value);
          if (tab !== undefined) {
            void navigate({ to: tab.to });
          }
        }}
        value={activeTabValue(pathname)}
        variant="pills"
      >
        <Tabs.List className={tabBarClasses.tabBar} grow justify="center">
          {MY_PAGE_TABS.map((tab) => (
            <Tabs.Tab key={tab.value} value={tab.value}>
              {tab.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>
      <Outlet />
      <MyPagePasskeyReprompt />
    </OwnerGate>
  );
}
