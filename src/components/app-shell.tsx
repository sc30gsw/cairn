import { AppShell as Shell, Button, Container, Group, Title } from "@mantine/core";
import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { DISPLAY_FONT } from "~/lib/theme";

type AppShellProps = {
  children: ReactNode;
  onSignOut: () => void;
};

const NAV = [
  { label: "日", match: (path: string) => path === "/" || path.startsWith("/days/"), to: "/" },
  { label: "履歴", match: (path: string) => path.startsWith("/history"), to: "/history" },
  { label: "項目", match: (path: string) => path.startsWith("/items"), to: "/items" },
  { label: "目標", match: (path: string) => path.startsWith("/goals"), to: "/goals" },
  { label: "ゴミ箱", match: (path: string) => path.startsWith("/trash"), to: "/trash" },
] as const;

export function AppShell({ children, onSignOut }: AppShellProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  return (
    <Shell header={{ height: { base: 108, sm: 64 } }} mode="static" padding="md">
      <Shell.Header px="md">
        <Group h="100%" justify="space-between" wrap="wrap">
          <Group gap="xs" wrap="wrap">
            <Title ff={DISPLAY_FONT} fw={500} order={4}>
              学習ログ
            </Title>
            {NAV.map((item) => (
              <Button
                key={item.to}
                component={Link}
                size="compact-sm"
                to={item.to}
                variant={item.match(pathname) ? "light" : "subtle"}
              >
                {item.label}
              </Button>
            ))}
          </Group>
          <Button onClick={onSignOut} size="compact-sm" variant="subtle">
            ログアウト
          </Button>
        </Group>
      </Shell.Header>
      <Shell.Main>
        <Container px={0} size="lg">
          {children}
        </Container>
      </Shell.Main>
    </Shell>
  );
}
