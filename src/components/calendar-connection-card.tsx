import { Badge, Button, Checkbox, ColorSwatch, Fieldset, Group, Stack, Text } from "@mantine/core";
import { IconLinkOff, IconRefresh } from "@tabler/icons-react";
import { CALENDAR_SYNC_NEEDS_REAUTH_MESSAGE, type CalendarSyncStatus } from "~domain/calendarSync";

import { GoogleIcon } from "~/components/google-icon";
import {
  CALENDAR_SYNC_CALENDARS_LABEL,
  CALENDAR_SYNC_DISCONNECT_LABEL,
  CALENDAR_SYNC_NOW_LABEL,
  CALENDAR_SYNC_RECONNECT_LABEL,
} from "~/lib/calendar-sync-labels";
import type { CalendarConnection, CalendarOutput } from "~/lib/calendar-sync-types";
import { NUMERAL_FONT } from "~/lib/theme";

const STATUS_BADGES = {
  error: { color: "yellow", label: "同期に失敗" },
  needsReauth: { color: "orange", label: "再接続が必要" },
  ok: { color: "green", label: "連携済み" },
} as const satisfies Record<CalendarSyncStatus, { color: string; label: string }>;

const JST_SYNCED_AT = new Intl.DateTimeFormat("ja-JP", {
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  month: "numeric",
  timeZone: "Asia/Tokyo",
});

type CalendarConnectionCardProps = {
  busy: boolean;
  connection: CalendarConnection;
  onDisconnect: () => void;
  onReconnect: () => void;
  onSync: () => void;
  onVisibleChange: (calendarIds: string[]) => void;
  output: CalendarOutput | null;
  outputChanging: boolean;
};

export function CalendarConnectionCard({
  busy,
  connection,
  onDisconnect,
  onReconnect,
  onSync,
  onVisibleChange,
  output,
  outputChanging,
}: CalendarConnectionCardProps) {
  const badge = STATUS_BADGES[connection.status];
  const disabled = busy || outputChanging;
  return (
    <Fieldset legend={connection.googleEmail ?? "Google アカウント"}>
      <Stack gap="sm">
        <Group gap="xs" wrap="wrap">
          <Badge color={badge.color} variant="light">
            {badge.label}
          </Badge>
          {connection.externalReadOnly ? (
            <Badge color="gray" variant="outline">
              外部予定は閲覧専用
            </Badge>
          ) : null}
        </Group>
        <Text c="dimmed" size="xs">
          最終同期:{" "}
          <Text ff={NUMERAL_FONT} span>
            {connection.lastSyncedAt === null
              ? "まだ同期していません"
              : JST_SYNCED_AT.format(new Date(connection.lastSyncedAt))}
          </Text>
          （日本時間）
        </Text>
        {connection.status === "needsReauth" ? (
          <Text c="red" component="output" size="sm">
            {CALENDAR_SYNC_NEEDS_REAUTH_MESSAGE} 取得済みの予定を表示しています。
          </Text>
        ) : null}
        {connection.status === "error" && connection.lastError !== null ? (
          <Text c="yellow.8" component="output" size="sm">
            {connection.lastError} 取得済みの予定を表示しています。
          </Text>
        ) : null}
        <Checkbox.Group
          description="空き時間の確認に使うカレンダーを選びます。"
          label={CALENDAR_SYNC_CALENDARS_LABEL}
          onChange={onVisibleChange}
          value={connection.visibleCalendarIds}
        >
          <Stack gap="xs" mt="xs">
            {connection.calendars.map((calendar) => (
              <Checkbox
                disabled={disabled || connection.status === "needsReauth"}
                key={calendar.id}
                label={
                  <Group gap="xs" wrap="nowrap">
                    <ColorSwatch
                      color={calendar.backgroundColor ?? "var(--cairn-muted-2)"}
                      radius="sm"
                      size={12}
                    />
                    <span>{calendar.summary}</span>
                    {output?.connectionId === connection.connectionId &&
                    output.calendarId === calendar.id ? (
                      <Text c="dimmed" size="xs" span>
                        （保存先）
                      </Text>
                    ) : null}
                  </Group>
                }
                value={calendar.id}
              />
            ))}
          </Stack>
        </Checkbox.Group>
        <Group gap="sm" justify="space-between" wrap="wrap">
          {connection.status === "needsReauth" ? (
            <Button
              disabled={busy}
              leftSection={<GoogleIcon />}
              onClick={onReconnect}
              type="button"
              variant="light"
            >
              {CALENDAR_SYNC_RECONNECT_LABEL}
            </Button>
          ) : (
            <Button
              disabled={disabled}
              leftSection={<IconRefresh aria-hidden size={16} />}
              onClick={onSync}
              type="button"
              variant="light"
            >
              {CALENDAR_SYNC_NOW_LABEL}
            </Button>
          )}
          <Button
            color="red"
            disabled={disabled}
            leftSection={<IconLinkOff aria-hidden size={16} />}
            onClick={onDisconnect}
            type="button"
            variant="subtle"
          >
            {CALENDAR_SYNC_DISCONNECT_LABEL}
          </Button>
        </Group>
      </Stack>
    </Fieldset>
  );
}
