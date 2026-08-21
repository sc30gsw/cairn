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
import type { CSSProperties, ReactNode } from "react";

import { RouteErrorComponent } from "~/components/error-state";
import { DISPLAY_FONT } from "~/lib/theme";

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

//? 手帳のインデックスタブ。奇数/偶数で微妙に回転を振り、手で貼ったタブのような不揃い感を出す
function tabStyle(active: boolean, index: number): CSSProperties {
  return {
    backgroundColor: active ? "var(--mantine-color-orange-6)" : "var(--mantine-color-white)",
    border: "1.5px solid var(--cairn-ink)",
    borderLeft: "none",
    borderRadius: "0 10px 14px 0/0 16px 10px 0",
    boxShadow: "2px 2px 0 rgba(16,15,15,.15)",
    color: active ? "var(--mantine-color-white)" : "var(--cairn-ink)",
    fontWeight: active ? 600 : 400,
    letterSpacing: 3,
    marginLeft: active ? -3 : -1.5,
    padding: "16px 7px",
    transform: `rotate(${index % 2 === 0 ? "0.6" : "-0.6"}deg)`,
    writingMode: "vertical-rl",
  };
}

function IndexTabs({ pathname }: Record<"pathname", string>) {
  return (
    <Stack gap="sm" pt={64} style={{ flex: "none", width: 56 }} visibleFrom="sm">
      {NAV.map(({ Icon, label, match, to }, index) => (
        <Box
          key={to}
          aria-current={match(pathname) ? "page" : undefined}
          component={Link}
          style={tabStyle(match(pathname), index)}
          to={to}
        >
          <Group gap={8} justify="center" wrap="nowrap">
            <Icon aria-hidden size={16} stroke={1.5} />
            {label}
          </Group>
        </Box>
      ))}
    </Stack>
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
                {accountMenu}
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
