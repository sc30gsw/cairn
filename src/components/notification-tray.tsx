import {
  ActionIcon,
  Box,
  Button,
  Card,
  Divider,
  EmptyState,
  Group,
  Indicator,
  Popover,
  ScrollArea,
  Stack,
  Text,
  UnstyledButton,
  VisuallyHidden,
} from "@mantine/core";
import { IconBell, IconBellOff } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import dayjs from "dayjs";
import { notificationMessage } from "~domain/notificationCopy";
import type { NotificationDto } from "~domain/validators";

import type { Id } from "~/../convex/_generated/dataModel";
import { notificationLink } from "~/lib/notification-link";
import { NUMERAL_FONT } from "~/lib/theme";

type NotificationTrayProps = {
  items: readonly NotificationDto[];
  onMarkAllRead: () => void;
  onMarkRead: (notificationId: Id<"notifications">) => void;
  unreadCount: number;
};

type NotificationRowProps = {
  notification: NotificationDto;
  onMarkRead: (notificationId: Id<"notifications">) => void;
};

//? 文言は convex/lib の共有純関数で組む。保存するのは事実だけで、言い方は保存しない(CVX-16)。
function NotificationRow({ notification, onMarkRead }: NotificationRowProps) {
  const { body, title } = notificationMessage(notification.payload);

  return (
    <UnstyledButton
      component={Link}
      onClick={() => {
        onMarkRead(notification._id);
      }}
      px="sm"
      py="xs"
      to={notificationLink(notification.payload.kind)}
    >
      <Group align="flex-start" gap="xs" wrap="nowrap">
        {/*? 未読の点。既読の行には出さない。色だけに頼らず VisuallyHidden でも未読を伝える */}
        {notification.read ? null : (
          <>
            <Box bg="orange.5" h={6} mt={6} w={6} />
            <VisuallyHidden>未読</VisuallyHidden>
          </>
        )}
        <Stack gap={2} miw={0}>
          <Text fw={600} size="sm">
            {title}
          </Text>
          <Text c="var(--cairn-muted-2)" size="xs" style={{ whiteSpace: "pre-line" }}>
            {body}
          </Text>
          <Text c="var(--cairn-muted)" ff={NUMERAL_FONT} size="xs">
            {dayjs(notification._creationTime).format("M/D HH:mm")}
          </Text>
        </Stack>
      </Group>
    </UnstyledButton>
  );
}

//* ヘッダーのベルと通知欄。開いただけでは既読にしない — バッジは「まだ手を付けていない催促の数」。
export function NotificationTray({
  items,
  onMarkAllRead,
  onMarkRead,
  unreadCount,
}: NotificationTrayProps) {
  return (
    <Indicator color="orange" disabled={unreadCount === 0} label={unreadCount} size={16}>
      <Popover position="bottom-end" width={340} withinPortal>
        <Popover.Target>
          <ActionIcon
            aria-label={`通知（未読 ${String(unreadCount)} 件）`}
            size="md"
            variant="default"
          >
            <IconBell aria-hidden size={18} stroke={1.5} />
          </ActionIcon>
        </Popover.Target>
        <Popover.Dropdown p={0}>
          <Card padding="sm">
            <Group justify="space-between" mb="xs">
              <Text fw={600}>通知</Text>
              {unreadCount === 0 ? null : (
                <Button onClick={onMarkAllRead} size="compact-xs" variant="subtle">
                  すべて既読にする
                </Button>
              )}
            </Group>
            <Divider mb="xs" />
            {items.length === 0 ? (
              <EmptyState size="sm">
                <EmptyState.Indicator>
                  <IconBellOff aria-hidden />
                </EmptyState.Indicator>
                <EmptyState.Title>通知はありません</EmptyState.Title>
              </EmptyState>
            ) : (
              <ScrollArea.Autosize mah={360} type="auto">
                <Stack gap={0}>
                  {items.map((notification) => (
                    <NotificationRow
                      key={notification._id}
                      notification={notification}
                      onMarkRead={onMarkRead}
                    />
                  ))}
                </Stack>
              </ScrollArea.Autosize>
            )}
          </Card>
        </Popover.Dropdown>
      </Popover>
    </Indicator>
  );
}
