import {
  Anchor,
  Button,
  Card,
  CopyButton,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { modals } from "@mantine/modals";
import { IconCalendarPlus } from "@tabler/icons-react";

import {
  useCalendarFeedStatus,
  useIssueCalendarFeed,
  useRevokeCalendarFeed,
} from "~/features/my-page/hooks/use-calendar-feed";
import { calendarFeedUrl, webcalUrl } from "~/lib/convex-site-url";
import { runMutation } from "~/lib/run-mutation";

export const CALENDAR_FEED_TITLE = "カレンダー購読";
export const CALENDAR_FEED_DESCRIPTION =
  "本番日と未達成のチェックポイントの期限を、Google / Apple / Outlook のカレンダーで購読できます。読み取り専用で、カレンダー側で変えてもこのアプリには戻りません。";
export const CALENDAR_FEED_ISSUE_LABEL = "購読 URL を発行";
export const CALENDAR_FEED_REISSUE_LABEL = "URL を作り直す";
export const CALENDAR_FEED_REVOKE_LABEL = "購読を止める";
export const CALENDAR_FEED_URL_LABEL = "購読 URL";
export const CALENDAR_FEED_COPY_LABEL = "URL をコピー";
export const CALENDAR_FEED_OPEN_LABEL = "カレンダーアプリで開く";
export const CALENDAR_FEED_INTERVAL_NOTE =
  "反映は各カレンダーの取得間隔に従います（Google は最大 24 時間ほど、Outlook は約 3〜24 時間、Apple は設定で選べます）。URL を知っている人は誰でも読めるので、他の人に渡さないでください。";
export const CALENDAR_FEED_ISSUED_MESSAGE = "購読 URL を発行しました";
export const CALENDAR_FEED_REISSUED_MESSAGE = "購読 URL を作り直しました。前の URL は使えません";
export const CALENDAR_FEED_REVOKED_MESSAGE = "カレンダー購読を止めました";

export function CalendarFeedSection() {
  const { data: status } = useCalendarFeedStatus();
  const issue = useIssueCalendarFeed();
  const revoke = useRevokeCalendarFeed();
  const convexUrl = import.meta.env.VITE_CONVEX_URL ?? "";

  function issueUrl(successMessage: string) {
    return runMutation(() => issue.mutateAsync({}), { successMessage });
  }

  function requestReissue() {
    modals.openConfirmModal({
      children:
        "いま登録しているカレンダーは更新されなくなります。新しい URL を登録し直してください。",
      confirmProps: { color: "orange" },
      labels: { cancel: "キャンセル", confirm: CALENDAR_FEED_REISSUE_LABEL },
      onConfirm: () => void issueUrl(CALENDAR_FEED_REISSUED_MESSAGE),
      title: "購読 URL を作り直しますか？",
    });
  }

  function requestRevoke() {
    modals.openConfirmModal({
      children: "URL は使えなくなります。カレンダー側の予定は次の取得で消えます。",
      confirmProps: { color: "red" },
      labels: { cancel: "キャンセル", confirm: CALENDAR_FEED_REVOKE_LABEL },
      onConfirm: () =>
        void runMutation(() => revoke.mutateAsync({}), {
          successMessage: CALENDAR_FEED_REVOKED_MESSAGE,
        }),
      title: "カレンダー購読を止めますか？",
    });
  }

  const url = status.token === null ? null : calendarFeedUrl(convexUrl, status.token);

  return (
    <Card padding="md">
      <Stack gap="md">
        <Title order={3}>{CALENDAR_FEED_TITLE}</Title>
        <Text c="dimmed" size="sm">
          {CALENDAR_FEED_DESCRIPTION}
        </Text>
        {url === null ? (
          <Group>
            <Button
              leftSection={<IconCalendarPlus aria-hidden size={16} />}
              onClick={() => void issueUrl(CALENDAR_FEED_ISSUED_MESSAGE)}
              type="button"
            >
              {CALENDAR_FEED_ISSUE_LABEL}
            </Button>
          </Group>
        ) : (
          <Stack gap="sm">
            <TextInput label={CALENDAR_FEED_URL_LABEL} readOnly value={url} />
            <Group gap="sm" wrap="wrap">
              <CopyButton value={url}>
                {({ copied, copy }) => (
                  <Button onClick={copy} type="button" variant="light">
                    {copied ? "コピーした" : CALENDAR_FEED_COPY_LABEL}
                  </Button>
                )}
              </CopyButton>
              <Anchor href={webcalUrl(url)}>{CALENDAR_FEED_OPEN_LABEL}</Anchor>
              <Button onClick={requestReissue} type="button" variant="default">
                {CALENDAR_FEED_REISSUE_LABEL}
              </Button>
              <Button color="red" onClick={requestRevoke} type="button" variant="subtle">
                {CALENDAR_FEED_REVOKE_LABEL}
              </Button>
            </Group>
          </Stack>
        )}
        <Text c="dimmed" size="xs">
          {CALENDAR_FEED_INTERVAL_NOTE}
        </Text>
      </Stack>
    </Card>
  );
}
