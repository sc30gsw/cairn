import { Anchor, Button, Group } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { cn } from "~/lib/utils";

type AppShellProps = {
  children: ReactNode;
  onSignOut: () => void;
};

export function AppShell({ children, onSignOut }: AppShellProps) {
  return (
    <div className={cn("mx-auto flex min-h-dvh max-w-3xl flex-col gap-4 px-4 py-4")}>
      <Group component="nav" gap="sm" justify="space-between" wrap="wrap">
        <Group gap="sm">
          <Anchor component={Link} to="/">
            今日
          </Anchor>
          <Anchor component={Link} to="/history">
            履歴
          </Anchor>
          <Anchor component={Link} to="/items">
            項目
          </Anchor>
          <Anchor component={Link} to="/goals">
            目標
          </Anchor>
          <Anchor component={Link} to="/trash">
            ゴミ箱
          </Anchor>
        </Group>
        <Button onClick={onSignOut} size="compact-sm" variant="subtle">
          ログアウト
        </Button>
      </Group>
      <main>{children}</main>
    </div>
  );
}
