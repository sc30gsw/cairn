import { fireEvent, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, test, vi } from "vite-plus/test";
import type { NotificationDto } from "~domain/validators";

import type { Id } from "~/../convex/_generated/dataModel";
import { NotificationTray } from "~/components/notification-tray";
import { renderWithMantine } from "~/test-utils/render";

type LinkProps = {
  children: ReactNode;
  to: string;
} & Record<string, unknown>;

//? Link はルーターに依存するので差し替える。onClick を落とさないよう rest はそのまま渡す。
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, ...rest }: LinkProps) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

const EVENING_ID = "notification-evening" as Id<"notifications">;

const EVENING = {
  _creationTime: Date.UTC(2026, 7, 20, 12, 0, 0),
  _id: EVENING_ID,
  payload: {
    dateJst: "2026-08-20",
    kind: "eveningUntouched",
    pendingCount: 2,
    source: "day",
  },
  read: false,
} satisfies NotificationDto;

function trayProps(items: NotificationDto[], unreadCount: number) {
  return {
    items,
    onMarkAllRead: vi.fn(),
    onMarkRead: vi.fn(),
    unreadCount,
  };
}

test("未読件数がベルの aria-label に出る", () => {
  const props = trayProps([EVENING], 2);
  const { getByRole } = renderWithMantine(<NotificationTray {...props} />);

  expect(getByRole("button", { name: "通知（未読 2 件）" })).toBeDefined();
});

test("通知0件では EmptyState が出る", async () => {
  const props = trayProps([], 0);
  const { getByRole, getByText } = renderWithMantine(<NotificationTray {...props} />);

  fireEvent.click(getByRole("button", { name: /通知/ }));

  await waitFor(() => {
    expect(getByText("通知はありません")).toBeDefined();
  });
});

test("行をクリックすると markRead が呼ばれる", async () => {
  const props = trayProps([EVENING], 1);
  const { getByRole } = renderWithMantine(<NotificationTray {...props} />);

  fireEvent.click(getByRole("button", { name: /通知/ }));
  const row = await waitFor(() =>
    getByRole("link", { hidden: true, name: /今日の残りがあります/ }),
  );
  fireEvent.click(row);

  expect(props.onMarkRead).toHaveBeenCalledWith(EVENING_ID);
});

test("「すべて既読にする」で markAllRead が呼ばれる", async () => {
  const props = trayProps([EVENING], 1);
  const { getByRole } = renderWithMantine(<NotificationTray {...props} />);

  fireEvent.click(getByRole("button", { name: /通知/ }));
  const markAll = await waitFor(() =>
    getByRole("button", { hidden: true, name: "すべて既読にする" }),
  );
  fireEvent.click(markAll);

  expect(props.onMarkAllRead).toHaveBeenCalledTimes(1);
});

test("未読0件のときは「すべて既読にする」を出さない", async () => {
  const props = trayProps([{ ...EVENING, read: true }], 0);
  const { getByRole, queryByRole } = renderWithMantine(<NotificationTray {...props} />);

  fireEvent.click(getByRole("button", { name: /通知/ }));
  await waitFor(() => {
    expect(getByRole("link", { hidden: true, name: /今日の残りがあります/ })).toBeDefined();
  });

  expect(queryByRole("button", { hidden: true, name: "すべて既読にする" })).toBeNull();
});
