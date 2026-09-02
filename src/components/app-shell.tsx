import { AppShell as Shell, Box, Group, Menu, Stack, Title, UnstyledButton } from "@mantine/core";
import {
  IconBulb,
  IconCalendarEvent,
  IconChartBar,
  IconColumns3,
  IconDots,
  IconLayoutKanban,
  IconNotebook,
  IconTarget,
  IconTemplate,
  IconTrash,
} from "@tabler/icons-react";
import { CatchBoundary, Link, useRouterState } from "@tanstack/react-router";
import { cn } from "cnfast";
import { Suspense, type ReactNode } from "react";

import { RouteErrorComponent } from "~/components/error-state";
import { NotificationBell } from "~/components/notification-bell";
import { NotificationBellFallback } from "~/components/notification-bell-fallback";
import { OfflineBanner } from "~/components/offline-banner";
import { PushSubscriptionSync } from "~/components/push-subscription-sync";
import {
  RunningTimerIndicator,
  RunningTimerIndicatorFallback,
} from "~/components/running-timer-indicator";
import { DISPLAY_FONT } from "~/lib/theme";

import classes from "~/components/app-shell.module.css";

type AppShellProps = {
  accountMenu: ReactNode;
  children: ReactNode;
};

type NavIcon = typeof IconCalendarEvent;

const NAV_ROUTES = [
  "/",
  "/board",
  "/history",
  "/review",
  "/items",
  "/presets",
  "/goals",
  "/methods",
  "/trash",
] as const;
type NavRoute = (typeof NAV_ROUTES)[number];

const NAV: {
  Icon: NavIcon;
  label: string;
  match: (path: string) => boolean;
  to: NavRoute;
}[] = [
  {
    Icon: IconCalendarEvent,
    label: "日",
    match: (path) => path === "/" || path.startsWith("/days/"),
    to: "/",
  },
  {
    Icon: IconColumns3,
    label: "ボード",
    match: (path) => path.startsWith("/board"),
    to: "/board",
  },
  {
    Icon: IconChartBar,
    label: "履歴",
    match: (path) => path.startsWith("/history"),
    to: "/history",
  },
  {
    Icon: IconNotebook,
    label: "レビュー",
    match: (path) => path.startsWith("/review"),
    to: "/review",
  },
  {
    Icon: IconLayoutKanban,
    label: "項目",
    match: (path) => path.startsWith("/items"),
    to: "/items",
  },
  {
    Icon: IconTemplate,
    label: "プリセット",
    match: (path) => path.startsWith("/presets"),
    to: "/presets",
  },
  {
    Icon: IconTarget,
    label: "目標",
    match: (path) => path.startsWith("/goals"),
    to: "/goals",
  },
  {
    Icon: IconBulb,
    label: "方法",
    match: (path) => path.startsWith("/methods"),
    to: "/methods",
  },
  {
    Icon: IconTrash,
    label: "ゴミ箱",
    match: (path) => path.startsWith("/trash"),
    to: "/trash",
  },
];

const MOBILE_PRIMARY = ["/", "/board", "/history", "/goals"] as const satisfies readonly NavRoute[];

function isMobilePrimary(to: NavRoute): boolean {
  return MOBILE_PRIMARY.some((route) => route === to);
}

function IndexTabs({ pathname }: Record<"pathname", string>) {
  return (
    <Box
      aria-label="画面ナビ（右小口）"
      className={classes.indexTabsRail}
      component="nav"
      visibleFrom="sm"
    >
      <Stack className={classes.tabStack} gap="sm">
        {NAV.map(({ Icon, label, match, to }, index) => {
          const active = match(pathname);
          return (
            <Box
              aria-current={active ? "page" : undefined}
              className={cn(classes.tab, active && classes.tabActive)}
              component={Link}
              key={to}
              style={{ "--tab-rotate": `${index % 2 === 0 ? 0.6 : -0.6}deg` }}
              to={to}
            >
              <Group gap={8} justify="center" wrap="nowrap">
                <Icon aria-hidden size={16} stroke={1.5} />
                {label}
              </Group>
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
}

function BottomIndexTabs({ pathname }: Record<"pathname", string>) {
  const primary = NAV.filter((entry) => isMobilePrimary(entry.to));
  const overflow = NAV.filter((entry) => !isMobilePrimary(entry.to));
  const overflowActive = overflow.some((entry) => entry.match(pathname));

  return (
    <Box
      aria-label="画面ナビ（下小口）"
      className={classes.bottomBar}
      component="nav"
      hiddenFrom="sm"
    >
      <Group gap={6} justify="space-between" wrap="nowrap">
        {primary.map(({ Icon, label, match, to }, index) => {
          const active = match(pathname);
          return (
            <Box
              aria-current={active ? "page" : undefined}
              className={cn(classes.bottomTab, active && classes.bottomTabActive)}
              component={Link}
              key={to}
              style={{ "--tab-rotate": `${index % 2 === 0 ? 0.5 : -0.5}deg` }}
              to={to}
            >
              <Icon aria-hidden size={18} stroke={1.5} />
              {label}
            </Box>
          );
        })}
        <Menu position="top-end" withinPortal>
          <Menu.Target>
            <UnstyledButton
              aria-label="その他の画面"
              className={cn(classes.bottomTab, overflowActive && classes.bottomTabActive)}
            >
              <IconDots aria-hidden size={18} stroke={1.5} />
              その他
            </UnstyledButton>
          </Menu.Target>
          <Menu.Dropdown>
            {overflow.map(({ Icon, label, to }) => (
              <Menu.Item
                component={Link}
                key={to}
                leftSection={<Icon aria-hidden size={16} stroke={1.5} />}
                to={to}
              >
                {label}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
      </Group>
    </Box>
  );
}

export function AppShell({ accountMenu, children }: AppShellProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <Shell mode="static" padding={0}>
      <Shell.Main>
        <Box
          className={classes.shellBody}
          maw={1180}
          mx="auto"
          px={{ base: "sm", sm: "xl" }}
          py={{ base: "md", sm: "xl" }}
        >
          <Group align="stretch" gap={0} wrap="nowrap">
            <Box
              className="cairn-paper-sheet"
              flex={1}
              miw={0}
              p={{ base: "md", sm: "xl" }}
              style={{
                border: "1.5px solid var(--cairn-ink)",
                borderRadius: "6px 14px 8px 16px/16px 6px",
                boxShadow: "3px 4px 0 rgba(16,15,15,.14), 0 18px 32px -14px rgba(16,15,15,.3)",
                minHeight: "82vh",
              }}
            >
              <Group align="center" gap="sm" justify="space-between" mb="lg" wrap="nowrap">
                <Group align="baseline" gap="sm" wrap="nowrap">
                  <Title ff={DISPLAY_FONT} fw={600} order={3}>
                    学習ログ
                  </Title>
                  <Box c="var(--cairn-muted-2)" fz="sm">
                    cairn — 紙の記録
                  </Box>
                </Group>
                <Group gap="sm" wrap="nowrap">
                  <Suspense fallback={<RunningTimerIndicatorFallback />}>
                    <RunningTimerIndicator />
                  </Suspense>
                  <Group align="center" gap="xs" wrap="nowrap">
                    <Suspense fallback={<NotificationBellFallback />}>
                      <NotificationBell />
                    </Suspense>
                    {accountMenu}
                  </Group>
                </Group>
              </Group>
              <OfflineBanner />
              <PushSubscriptionSync />
              <CatchBoundary errorComponent={RouteErrorComponent} getResetKey={() => pathname}>
                {children}
              </CatchBoundary>
            </Box>
            <IndexTabs pathname={pathname} />
          </Group>
        </Box>
        <BottomIndexTabs pathname={pathname} />
      </Shell.Main>
    </Shell>
  );
}
