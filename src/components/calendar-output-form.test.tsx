import { fireEvent } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";

import type { Id } from "~/../convex/_generated/dataModel";
import { CalendarOutputForm } from "~/components/calendar-output-form";
import type { CalendarConnection } from "~/lib/calendar-sync-types";
import { renderWithMantine } from "~/test-utils/render";

const WORK_CONNECTION: CalendarConnection = {
  connectionId: "work-connection" as Id<"calendarConnections">,
  googleAccountId: "work-google",
  googleEmail: "work@example.com",
  externalReadOnly: true,
  canWrite: false,
  calendars: [
    { id: "work@example.com", summary: "仕事の予定", primary: true, accessRole: "owner" },
    { id: "team-calendar", summary: "チーム共有", primary: false, accessRole: "reader" },
  ],
  lastError: null,
  lastSyncedAt: null,
  status: "ok",
  visibleCalendarIds: ["work@example.com"],
};

test("閲覧専用で接続したアカウントも書き込み先に選べ、保存時に正確な接続とカレンダーを渡す", async () => {
  const onSave = vi.fn().mockResolvedValue(undefined);
  const { getByRole, queryByRole } = renderWithMantine(
    <CalendarOutputForm
      busy={false}
      connections={[WORK_CONNECTION]}
      onSave={onSave}
      output={null}
    />,
  );

  fireEvent.click(getByRole("combobox", { name: "Cairn の予定の保存先" }));
  expect(queryByRole("option", { name: "チーム共有" })).toBeNull();
  fireEvent.click(getByRole("option", { name: "仕事の予定" }));
  expect(onSave).not.toHaveBeenCalled();
  fireEvent.click(getByRole("button", { name: "保存先を設定" }));

  await vi.waitFor(() =>
    expect(onSave).toHaveBeenCalledWith({
      connectionId: WORK_CONNECTION.connectionId,
      calendarId: "work@example.com",
    }),
  );
});

test("出力先を移動している間は保存操作ができない", () => {
  const { getByRole } = renderWithMantine(
    <CalendarOutputForm busy connections={[WORK_CONNECTION]} onSave={vi.fn()} output={null} />,
  );
  expect(getByRole("button", { name: "保存先を設定" }).hasAttribute("disabled")).toBe(true);
});
