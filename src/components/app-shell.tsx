import { AppShell as Shell, Box, Button, Group, ScrollArea, Stack, Title } from "@mantine/core";
import {
  IconCalendarEvent,
  IconChartBar,
  IconColumns3,
  IconLayoutKanban,
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

const NAV: {
  Icon: NavIcon;
  label: string;
  match: (path: string) => boolean;
  to: string;
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
    Icon: IconTrash,
    label: "ゴミ箱",
    match: (path) => path.startsWith("/trash"),
    to: "/trash",
  },
];

function IndexTabs({ pathname }: Record<"pathname", string>) {
  return (
    <Box className={classes.indexTabsRail} visibleFrom="sm">
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

function MobileTabs({ pathname }: Record<"pathname", string>) {
  return (
    <ScrollArea hiddenFrom="sm" mb="sm" scrollbarSize={6} type="auto">
      <Group gap="xs" wrap="nowrap">
        {NAV.map(({ Icon, label, match, to }) => (
          <Button
            key={to}
            component={Link}
            leftSection={<Icon aria-hidden size={16} stroke={1.5} />}
            size="compact-sm"
            to={to}
            variant={match(pathname) ? "filled" : "default"}
          >
            {label}
          </Button>
        ))}
      </Group>
    </ScrollArea>
  );
}

export function AppShell({ accountMenu, children }: AppShellProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <Shell mode="static" padding={0}>
      <Shell.Main>
        <Box maw={1180} mx="auto" px={{ base: "sm", sm: "xl" }} py={{ base: "md", sm: "xl" }}>
          <MobileTabs pathname={pathname} />
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
                  {/*? 計測中インジケータ。計測が無ければ null を返すので何も出ない(#51 §13.2) */}
                  <Suspense fallback={<RunningTimerIndicatorFallback />}>
                    <RunningTimerIndicator />
                  </Suspense>
                  <Group align="center" gap="xs" wrap="nowrap">
                    {/*? 通知ベル。全画面共通で、未読件数を Indicator に出す(#56 §10.1) */}
                    <Suspense fallback={<NotificationBellFallback />}>
                      <NotificationBell />
                    </Suspense>
                    {accountMenu}
                  </Group>
                </Group>
              </Group>
              {/*? ページ内のエラーはヘッダーとナビを残したまま出す。別の画面へ移れば解除される */}
              <CatchBoundary errorComponent={RouteErrorComponent} getResetKey={() => pathname}>
                {children}
              </CatchBoundary>
            </Box>
            <IndexTabs pathname={pathname} />
          </Group>
        </Box>
      </Shell.Main>
    </Shell>
  );
}
