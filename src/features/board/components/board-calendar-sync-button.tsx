import { Badge, Button, Modal, Skeleton, Stack, Tooltip } from "@mantine/core";
import { Suspense } from "react";

import { CalendarSyncSection } from "~/components/calendar-sync-section";
import { GoogleIcon } from "~/components/google-icon";
import { GoogleLabel } from "~/components/google-label";
import { boardRoute } from "~/features/board/lib/board-route-api";
import { useCalendarSyncStatus } from "~/hooks/use-calendar-sync";
import { CALENDAR_SYNC_TITLE } from "~/lib/calendar-sync-labels";

export const BOARD_CALENDAR_SYNC_TOOLTIP =
  "Google カレンダーとの連携・同期状態を確認します。連携後は、外部予定を「予定」タブの日・週・月・年表示で確認できます。";

function CalendarSyncHealthBadge() {
  const { data: status } = useCalendarSyncStatus();
  const failedCount = status.connections.filter((connection) => connection.status !== "ok").length;
  return failedCount === 0 ? null : (
    <Badge color="orange" variant="light">
      未同期 {failedCount}
    </Badge>
  );
}

export function BoardCalendarSyncButton() {
  const { calendarSync, tab } = boardRoute.useSearch();
  const navigate = boardRoute.useNavigate();

  if (tab !== "schedule") {
    return null;
  }

  function setOpened(opened: boolean) {
    void navigate({
      search: (current) => ({ ...current, calendarSync: opened ? true : undefined }),
    });
  }

  return (
    <>
      <Tooltip
        events={{ focus: true, hover: true, touch: true }}
        interactive
        label={BOARD_CALENDAR_SYNC_TOOLTIP}
        multiline
        w={280}
        withArrow
      >
        <Button
          aria-haspopup="dialog"
          leftSection={<GoogleIcon />}
          onClick={() => setOpened(true)}
          rightSection={
            <Suspense fallback={null}>
              <CalendarSyncHealthBadge />
            </Suspense>
          }
          variant="light"
        >
          {CALENDAR_SYNC_TITLE}
        </Button>
      </Tooltip>
      <Modal
        closeButtonProps={{ "aria-label": "Google カレンダー連携を閉じる" }}
        onClose={() => setOpened(false)}
        opened={calendarSync === true}
        size="lg"
        title={<GoogleLabel>{CALENDAR_SYNC_TITLE}</GoogleLabel>}
      >
        <Suspense
          fallback={
            <Stack aria-label="Google カレンダー連携を読み込み中" component="output" gap="md">
              <Skeleton animate={false} height={40} />
              <Skeleton animate={false} height={120} />
            </Stack>
          }
        >
          <CalendarSyncSection />
        </Suspense>
      </Modal>
    </>
  );
}
