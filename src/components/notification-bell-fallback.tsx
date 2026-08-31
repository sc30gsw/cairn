import { ActionIcon } from "@mantine/core";
import { Shimmer } from "@shimmer-from-structure/react";
import { IconBell } from "@tabler/icons-react";

export function NotificationBellFallback() {
  return (
    <Shimmer loading>
      <ActionIcon aria-label="通知" size="md" variant="default">
        <IconBell aria-hidden size={18} stroke={1.5} />
      </ActionIcon>
    </Shimmer>
  );
}
