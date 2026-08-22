import { Avatar, Menu } from "@mantine/core";
import { IconLogout, IconUserCircle } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

import { useAppShellUser } from "~/features/auth/hooks/use-auth-session";
import { signOutAndReload } from "~/features/auth/lib/auth-actions";
import { userLabel } from "~/lib/user-label";

export function AuthAccountMenu() {
  const user = useAppShellUser();

  if (user === null) {
    return null;
  }

  return (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <Avatar
          alt={userLabel(user)}
          aria-label="アカウントメニュー"
          color="orange"
          radius="xl"
          src={user.image ?? undefined}
          style={{ border: "1.5px solid var(--cairn-ink)" }}
        >
          {userLabel(user).slice(0, 1)}
        </Avatar>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          component={Link}
          leftSection={<IconUserCircle aria-hidden size={16} stroke={1.5} />}
          to="/my-page"
        >
          マイページ
        </Menu.Item>
        <Menu.Item
          color="red"
          onClick={signOutAndReload}
          rightSection={<IconLogout aria-hidden size={16} stroke={1.5} />}
        >
          ログアウト
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
