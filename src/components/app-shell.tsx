import {
  AppShell as Shell,
  Avatar,
  Burger,
  Button,
  Container,
  Drawer,
  Group,
  Menu,
  NavLink,
  Stack,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconCalendarEvent,
  IconChartBar,
  IconLayoutKanban,
  IconLogout,
  IconTarget,
  IconTemplate,
  IconTrash,
} from "@tabler/icons-react";
import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";

import type { AppShellUser } from "~/features/auth/types/session";
import { DISPLAY_FONT } from "~/lib/theme";

type AppShellProps = {
  children: ReactNode;
  onSignOut: () => void;
  user: AppShellUser;
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

function userLabel(user: AppShellUser): string {
  if (user.name !== null && user.name !== undefined && user.name !== "") {
    return user.name;
  }
  if (user.email !== null && user.email !== undefined && user.email !== "") {
    return user.email;
  }
  return "所有者";
}

function NavLinks({ onNavigate, pathname }: { onNavigate?: () => void; pathname: string }) {
  return (
    <Group gap="xs" wrap="nowrap">
      {NAV.map(({ Icon, label, match, to }) => (
        <Button
          key={to}
          component={Link}
          leftSection={<Icon aria-hidden size={16} stroke={1.5} />}
          onClick={onNavigate}
          size="compact-sm"
          to={to}
          variant={match(pathname) ? "light" : "subtle"}
        >
          {label}
        </Button>
      ))}
    </Group>
  );
}

function DrawerNavLinks({ onNavigate, pathname }: { onNavigate: () => void; pathname: string }) {
  return (
    <Stack gap={4}>
      {NAV.map(({ Icon, label, match, to }) => (
        <NavLink
          active={match(pathname)}
          component={Link}
          key={to}
          label={label}
          leftSection={<Icon aria-hidden size={18} stroke={1.5} />}
          onClick={onNavigate}
          to={to}
        />
      ))}
    </Stack>
  );
}

export function AppShell({ children, onSignOut, user }: AppShellProps) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [opened, { close, toggle }] = useDisclosure();

  return (
    <Shell header={{ height: 64 }} mode="static" padding="md">
      <Shell.Header px="md">
        <Group h="100%" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger hiddenFrom="sm" onClick={toggle} opened={opened} size="sm" />
            <Title ff={DISPLAY_FONT} fw={500} order={4}>
              学習ログ
            </Title>
            <Group visibleFrom="sm" wrap="nowrap">
              <NavLinks pathname={pathname} />
            </Group>
          </Group>
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <Avatar
                alt={userLabel(user)}
                aria-label="アカウントメニュー"
                color="blue"
                radius="xl"
                src={user.image ?? undefined}
              >
                {userLabel(user).slice(0, 1)}
              </Avatar>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item
                color="red"
                onClick={onSignOut}
                rightSection={<IconLogout aria-hidden size={16} stroke={1.5} />}
              >
                ログアウト
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Shell.Header>
      <Drawer hiddenFrom="sm" onClose={close} opened={opened} padding="md" title="メニュー">
        <DrawerNavLinks onNavigate={close} pathname={pathname} />
      </Drawer>
      <Shell.Main>
        <Container px={0} size="lg">
          {children}
        </Container>
      </Shell.Main>
    </Shell>
  );
}
