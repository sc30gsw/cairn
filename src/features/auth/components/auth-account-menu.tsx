import { Avatar, Menu } from "@mantine/core";
import { IconBell, IconChartBar, IconLogout, IconUserCircle } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

import { signOutAndReload } from "~/features/auth/lib/auth-actions";
import { useAppShellUser } from "~/hooks/use-auth-session";
import { useAvatarDisplayUrl } from "~/hooks/use-avatar-display-url";
import { userLabel } from "~/lib/user-label";

export function AuthAccountMenu() {
  const user = useAppShellUser();
  const avatarSrc = useAvatarDisplayUrl(user?.image);

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
          src={avatarSrc}
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
          アカウント設定
        </Menu.Item>
        <Menu.Item
          component={Link}
          leftSection={<IconChartBar aria-hidden size={16} stroke={1.5} />}
          to="/my-page/status"
        >
          状況
        </Menu.Item>
        <Menu.Item
          component={Link}
          leftSection={<IconBell aria-hidden size={16} stroke={1.5} />}
          to="/my-page/notifications"
        >
          通知設定
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
