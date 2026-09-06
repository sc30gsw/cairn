import {
  Badge,
  Button,
  Card,
  Checkbox,
  ColorSwatch,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconBrandGoogle, IconRefresh } from "@tabler/icons-react";
import { Result } from "better-result";
import { useEffect, useState } from "react";
import { CALENDAR_SYNC_NEEDS_REAUTH_MESSAGE, type CalendarSyncStatus } from "~domain/calendarSync";
import type { OwnerSyncOutcome } from "~domain/validators";

import {
  clearCalendarSyncConnectPending,
  linkGoogleCalendar,
  readCalendarSyncConnectPending,
  readCalendarSyncReturnError,
} from "~/features/my-page/lib/calendar-sync-actions";
import {
  useCalendarSyncStatus,
  useConnectCalendarSync,
  useDisconnectCalendarSync,
  useSetVisibleCalendars,
  useSyncCalendarNow,
} from "~/hooks/use-calendar-sync";
import { notifyError } from "~/lib/notify";
import { runMutation } from "~/lib/run-mutation";
import { NUMERAL_FONT } from "~/lib/theme";

const CALENDAR_SYNC_TITLE = "カレンダー同期";
const CALENDAR_SYNC_DESCRIPTION =
  "本番日・チェックポイントの期限・予定を Google カレンダーに出し、Google 側で動かした変更も戻します。Google カレンダーの予定は、予定タブに外部予定として薄く並びます。";
export const CALENDAR_SYNC_CONNECT_LABEL = "Google カレンダーと連携";
export const CALENDAR_SYNC_RECONNECT_LABEL = "もう一度接続";
export const CALENDAR_SYNC_NOW_LABEL = "今すぐ同期";
export const CALENDAR_SYNC_DISCONNECT_LABEL = "連携を解除";
export const CALENDAR_SYNC_CALENDARS_LABEL = "表示するカレンダー";
const CALENDAR_SYNC_CONNECTED_MESSAGE = "Google カレンダーと連携しました";
const CALENDAR_SYNC_SYNCED_MESSAGE = "同期しました";
const CALENDAR_SYNC_DISCONNECTED_MESSAGE = "カレンダー同期を解除しました";
export { CALENDAR_SYNC_NEEDS_REAUTH_MESSAGE };
const CALENDAR_SYNC_CONNECTED_PARTIAL_MESSAGE =
  "連携しましたが、最初の同期に失敗しました。状態を確認してください";
const CALENDAR_SYNC_DENIED_MESSAGE =
  "Google カレンダーの権限が許可されなかったため、連携を始められませんでした。";
const CALENDAR_SYNC_CALENDARS_HINT =
  "外して良いのは、空き時間の確認に要らないカレンダー（祝日など）。書き込み先はメインカレンダーで、ここでは変わりません。";
const CALENDAR_SYNC_DISCONNECT_CONFIRM =
  "このアプリが Google カレンダーに作った本番日・期限・予定は消えます。Google 側で作った予定はそのまま残ります。";

const STATUS_BADGES = {
  error: { color: "yellow", label: "同期に失敗" },
  needsReauth: { color: "orange", label: "再接続が必要" },
  ok: { color: "green", label: "同期中" },
} as const satisfies Record<CalendarSyncStatus, { color: string; label: string }>;

const JST_SYNCED_AT = new Intl.DateTimeFormat("ja-JP", {
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  month: "numeric",
  timeZone: "Asia/Tokyo",
});

async function startLink() {
  const result = await linkGoogleCalendar();
  if (Result.isError(result)) {
    notifyError(result.error, result.error.message);
  }
}

function connectedMessage(outcome: OwnerSyncOutcome): string {
  return outcome === "ok"
    ? CALENDAR_SYNC_CONNECTED_MESSAGE
    : CALENDAR_SYNC_CONNECTED_PARTIAL_MESSAGE;
}

function formatSyncedAt(syncedAt: number | null): string {
  return syncedAt === null ? "まだ同期していません" : JST_SYNCED_AT.format(new Date(syncedAt));
}

export function CalendarSyncSection() {
  const { data: status } = useCalendarSyncStatus();
  const connect = useConnectCalendarSync();
  const disconnect = useDisconnectCalendarSync();
  const syncNow = useSyncCalendarNow();
  const setVisible = useSetVisibleCalendars();
  const [busy, setBusy] = useState(readCalendarSyncConnectPending);

  async function withBusy(operation: () => Promise<void>) {
    setBusy(true);
    try {
      await operation();
    } catch (error) {
      notifyError(error);
    }
    setBusy(false);
  }

  useEffect(() => {
    if (!readCalendarSyncConnectPending()) {
      return;
    }
    clearCalendarSyncConnectPending();
    const returnError = readCalendarSyncReturnError();
    if (returnError !== null) {
      notifyError(new Error(returnError), CALENDAR_SYNC_DENIED_MESSAGE);
      setBusy(false);
      return;
    }
    void runMutation(() => connect({}), { successMessage: connectedMessage }).then(() =>
      setBusy(false),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only: 戻ってきた1回だけ
  }, []);

  function runSyncNow() {
    return withBusy(() =>
      runMutation(() => syncNow({}), {
        successMessage: (outcome) => (outcome === "ok" ? CALENDAR_SYNC_SYNCED_MESSAGE : ""),
      }),
    );
  }

  function requestDisconnect() {
    modals.openConfirmModal({
      children: CALENDAR_SYNC_DISCONNECT_CONFIRM,
      confirmProps: { color: "red" },
      labels: { cancel: "キャンセル", confirm: CALENDAR_SYNC_DISCONNECT_LABEL },
      onConfirm: () => {
        void withBusy(() =>
          runMutation(() => disconnect({}), {
            successMessage: CALENDAR_SYNC_DISCONNECTED_MESSAGE,
          }),
        );
      },
      title: "カレンダー同期を解除しますか？",
    });
  }

  function changeVisible(calendarIds: string[]) {
    void runMutation(() => setVisible({ calendarIds }), { silent: true });
  }

  if (status === null) {
    return (
      <Card padding="md">
        <Stack gap="md">
          <Title order={3}>{CALENDAR_SYNC_TITLE}</Title>
          <Text c="dimmed" size="sm">
            {CALENDAR_SYNC_DESCRIPTION}
          </Text>
          <Group>
            <Button
              leftSection={<IconBrandGoogle aria-hidden size={16} />}
              loading={busy}
              onClick={() => void startLink()}
              type="button"
            >
              {CALENDAR_SYNC_CONNECT_LABEL}
            </Button>
          </Group>
          <Text c="dimmed" size="xs">
            Google の画面でカレンダーの権限を許可すると、このページに戻って同期が始まります。
          </Text>
        </Stack>
      </Card>
    );
  }

  const badge = STATUS_BADGES[status.status];

  return (
    <Card padding="md">
      <Stack gap="md">
        <Group justify="space-between" wrap="wrap">
          <Title order={3}>{CALENDAR_SYNC_TITLE}</Title>
          <Badge color={badge.color} variant="light">
            {badge.label}
          </Badge>
        </Group>
        <Text c="dimmed" size="sm">
          {CALENDAR_SYNC_DESCRIPTION}
        </Text>
        <Stack gap={2}>
          <Text size="sm">
            接続中の Google アカウント:{" "}
            <Text fw={600} span>
              {status.googleEmail ?? "不明"}
            </Text>
          </Text>
          <Text c="dimmed" size="sm">
            最終同期:{" "}
            <Text ff={NUMERAL_FONT} span>
              {formatSyncedAt(status.lastSyncedAt)}
            </Text>
          </Text>
          {status.status === "needsReauth" ? (
            <Text c="red" size="sm">
              {CALENDAR_SYNC_NEEDS_REAUTH_MESSAGE}
            </Text>
          ) : null}
          {status.status === "error" && status.lastError !== null ? (
            <Text c="yellow.8" size="sm">
              {status.lastError}
            </Text>
          ) : null}
        </Stack>
        <Checkbox.Group
          description={CALENDAR_SYNC_CALENDARS_HINT}
          label={CALENDAR_SYNC_CALENDARS_LABEL}
          onChange={changeVisible}
          value={status.visibleCalendarIds}
        >
          <Stack gap="xs" mt="xs">
            {status.calendars.map((calendar) => (
              <Checkbox
                disabled={busy || status.status === "needsReauth"}
                key={calendar.id}
                label={
                  <Group gap="xs" wrap="nowrap">
                    <ColorSwatch
                      color={calendar.backgroundColor ?? "var(--cairn-muted-2)"}
                      radius="sm"
                      size={12}
                    />
                    <span>{calendar.summary}</span>
                    {calendar.primary ? (
                      <Text c="dimmed" size="xs" span>
                        （書き込み先）
                      </Text>
                    ) : null}
                  </Group>
                }
                value={calendar.id}
              />
            ))}
          </Stack>
        </Checkbox.Group>
        <Group gap="sm" wrap="wrap">
          {status.status === "needsReauth" ? (
            <Button
              leftSection={<IconBrandGoogle aria-hidden size={16} />}
              loading={busy}
              onClick={() => void startLink()}
              type="button"
            >
              {CALENDAR_SYNC_RECONNECT_LABEL}
            </Button>
          ) : (
            <Button
              leftSection={<IconRefresh aria-hidden size={16} />}
              loading={busy}
              onClick={() => void runSyncNow()}
              type="button"
              variant="light"
            >
              {CALENDAR_SYNC_NOW_LABEL}
            </Button>
          )}
          <Button
            color="red"
            disabled={busy}
            onClick={requestDisconnect}
            type="button"
            variant="subtle"
          >
            {CALENDAR_SYNC_DISCONNECT_LABEL}
          </Button>
        </Group>
      </Stack>
    </Card>
  );
}
