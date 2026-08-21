import type { ReactNode } from "react";
import { expect, test, vi } from "vite-plus/test";
import { STATUSES } from "~domain/domain";

import { BoardKanban } from "~/features/board/components/board-kanban";
import type { BoardObstacle, BoardRow } from "~/features/board/types/board";
import { renderWithMantine } from "~/test-utils/render";

const [confirmed, pending, skipped] = STATUSES;

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children?: ReactNode; to: string }) => <a href={to}>{children}</a>,
}));

vi.mock("~/features/catalog/hooks/use-dnd", async () => {
  const dnd = await vi.importActual<typeof import("@hello-pangea/dnd")>("@hello-pangea/dnd");
  return {
    useDnd: () => dnd,
  };
});

function row(id: string, status: BoardRow["status"], name: string): BoardRow {
  return {
    _id: id as BoardRow["_id"],
    category: "多聴",
    categorySortOrder: 1,
    content: "",
    itemId: "i1" as BoardRow["itemId"],
    itemName: name,
    minutes: 30,
    sortOrder: 0,
    status,
  };
}

test("カンバンは未着手・確定・スキップと次の一手を並べる", () => {
  const obstacle = {
    _id: "o1" as BoardObstacle["_id"],
    ifText: "眠い",
    thenText: "金フレを1ページだけ開く",
  } satisfies BoardObstacle;

  const noop = vi.fn(async () => undefined);

  const { getAllByText, getByRole, getByText } = renderWithMantine(
    <BoardKanban
      checkpointLabel="Part 2 を聞き取る（2026-08-20）"
      obstacles={[obstacle]}
      onConfirm={noop}
      onSkip={noop}
      onUnskip={noop}
      rows={[
        row("r1", pending, "Distinction 2000"),
        row("r2", confirmed, "金のフレーズ"),
        row("r3", skipped, "英会話"),
      ]}
    />,
  );

  expect(getAllByText("未着手").length).toBeGreaterThanOrEqual(2);
  expect(getByText("確定")).toBeDefined();
  expect(getByText("スキップ")).toBeDefined();
  expect(getByText("次の一手")).toBeDefined();
  expect(getByText("Distinction 2000")).toBeDefined();
  expect(getByText("金のフレーズ")).toBeDefined();
  expect(getByText("英会話")).toBeDefined();
  expect(getByText("金フレを1ページだけ開く")).toBeDefined();
  expect(getByText("Part 2 を聞き取る（2026-08-20）")).toBeDefined();
  expect(getByRole("link", { name: /Distinction 2000/ }).getAttribute("href")).toBe("/");
  expect(getByRole("link", { name: /金フレを1ページだけ開く/ }).getAttribute("href")).toBe(
    "/goals",
  );
});
