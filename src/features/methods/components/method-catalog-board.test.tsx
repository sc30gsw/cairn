import { fireEvent, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vite-plus/test";

import {
  METHOD_CATALOG_EMPTY,
  MethodCatalogBoard,
} from "~/features/methods/components/method-catalog-board";
import type { Method, MethodCatalog } from "~/features/methods/types/method";
import { renderWithMantine } from "~/test-utils/render";

const catalogActions = vi.hoisted(() => ({
  onApplyLaneOrder: vi.fn(),
  onApplyMethodOrder: vi.fn(),
  onCreateLane: vi.fn(),
  onCreateMethod: vi.fn(),
  onRemoveLane: vi.fn(),
  onRemoveMethod: vi.fn(),
  onRenameLane: vi.fn(),
  onSetNowViewing: vi.fn(),
  onUpdateMethod: vi.fn(),
}));

vi.mock("~/features/methods/hooks/use-method-catalog-actions", () => ({
  useMethodCatalogActions: () => catalogActions,
}));

vi.mock("~/hooks/use-dnd", async () => {
  const dnd = await vi.importActual<typeof import("@hello-pangea/dnd")>("@hello-pangea/dnd");
  return {
    useDnd: () => dnd,
  };
});

//? TipTap の contenteditable は happy-dom で測れないため、開いたカードは差し替える。
//? モーダル自体の欄構成(タイトル/本文/完了条件/メモ)は目視とレビューで担保する。
vi.mock("~/features/methods/components/method-card-modal", () => ({
  MethodCardModal: ({ method }: Record<"method", Method>) => (
    <dialog aria-label={`${method.name}の開いたカード`} open />
  ),
}));

function method(overrides: Partial<Method> & Pick<Method, "_id" | "laneId" | "name">): Method {
  return {
    bodyText: "",
    completionHtml: "",
    memoHtml: "",
    nowViewing: false,
    sortOrder: 0,
    ...overrides,
  };
}

test("空のカタログでは案内とレーン追加フォームだけが出る", () => {
  const { getByRole, getByText } = renderWithMantine(
    <MethodCatalogBoard catalog={{ lanes: [], methods: [] }} />,
  );

  expect(getByText(METHOD_CATALOG_EMPTY)).toBeDefined();
  expect(getByRole("button", { name: "レーンを追加" })).toBeDefined();
});

test("レーンの下に方法カードが並び、いま見るの方法は正面にも出る", () => {
  const catalog: MethodCatalog = {
    lanes: [
      { _id: "l1" as never, name: "模試レーン", sortOrder: 0 },
      { _id: "l2" as never, name: "単語レーン", sortOrder: 1 },
    ],
    methods: [
      method({
        _id: "m1" as never,
        bodyText: "1回目は本番通り2時間で解く",
        laneId: "l1" as never,
        name: "公式問題集の3回法",
        nowViewing: true,
      }),
      method({ _id: "m2" as never, laneId: "l2" as never, name: "金フレ高速回転", sortOrder: 1 }),
    ],
  };
  const { getAllByText, getByRole } = renderWithMantine(<MethodCatalogBoard catalog={catalog} />);

  expect(getByRole("button", { name: "模試レーンを保存" })).toBeDefined();
  expect(getByRole("button", { name: "単語レーンを削除" })).toBeDefined();
  //? レーン(列)自体のドラッグつまみ
  expect(getByRole("button", { name: "模試レーンをドラッグ" })).toBeDefined();
  expect(getByRole("button", { name: "単語レーンをドラッグ" })).toBeDefined();
  expect(getByRole("button", { name: "公式問題集の3回法を開く" })).toBeDefined();
  expect(getByRole("button", { name: "金フレ高速回転をいま見るにする" })).toBeDefined();
  expect(getByRole("button", { name: "公式問題集の3回法のいま見るを外す" })).toBeDefined();
  //? 正面カード + レーン内カードのバッジで2回現れる
  expect(getAllByText("いま見る").length).toBeGreaterThanOrEqual(2);
  //? 正面カードは本文の先頭を見せる
  expect(getAllByText("1回目は本番通り2時間で解く").length).toBeGreaterThanOrEqual(1);
});

test("いま見るトグルは setNowViewing を反転値で呼ぶ", () => {
  const catalog: MethodCatalog = {
    lanes: [{ _id: "l1" as never, name: "模試レーン", sortOrder: 0 }],
    methods: [method({ _id: "m1" as never, laneId: "l1" as never, name: "公式問題集の3回法" })],
  };
  const { getByRole } = renderWithMantine(<MethodCatalogBoard catalog={catalog} />);

  fireEvent.click(getByRole("button", { name: "公式問題集の3回法をいま見るにする" }));
  expect(catalogActions.onSetNowViewing).toHaveBeenCalledWith({
    methodId: "m1",
    nowViewing: true,
  });
});

test("移動メニューはドラッグと同じ applyMethodOrder に流す(移動先の末尾へ)", async () => {
  const catalog: MethodCatalog = {
    lanes: [
      { _id: "l1" as never, name: "模試レーン", sortOrder: 0 },
      { _id: "l2" as never, name: "単語レーン", sortOrder: 1 },
    ],
    methods: [
      method({ _id: "m1" as never, laneId: "l1" as never, name: "公式問題集の3回法" }),
      method({ _id: "m2" as never, laneId: "l2" as never, name: "金フレ高速回転" }),
    ],
  };
  const { getByRole } = renderWithMantine(<MethodCatalogBoard catalog={catalog} />);

  fireEvent.click(getByRole("button", { name: "公式問題集の3回法を別のレーンへ移動" }));
  //? Floating UI のドロップダウンは happy-dom では hidden のまま(testing.md)
  await waitFor(() => {
    expect(getByRole("menuitem", { hidden: true, name: "単語レーン" })).toBeDefined();
  });
  fireEvent.click(getByRole("menuitem", { hidden: true, name: "単語レーン" }));

  expect(catalogActions.onApplyMethodOrder).toHaveBeenCalledWith({
    updates: [
      { laneId: "l1", orderedMethodIds: [] },
      { laneId: "l2", orderedMethodIds: ["m2", "m1"] },
    ],
  });
});

test("レーンが1つだけなら移動メニューは出ない", () => {
  const catalog: MethodCatalog = {
    lanes: [{ _id: "l1" as never, name: "模試レーン", sortOrder: 0 }],
    methods: [method({ _id: "m1" as never, laneId: "l1" as never, name: "公式問題集の3回法" })],
  };
  const { queryByRole } = renderWithMantine(<MethodCatalogBoard catalog={catalog} />);

  expect(queryByRole("button", { name: "公式問題集の3回法を別のレーンへ移動" })).toBeNull();
});

test("開くで開いたカード(モーダル)が現れる", () => {
  const catalog: MethodCatalog = {
    lanes: [{ _id: "l1" as never, name: "模試レーン", sortOrder: 0 }],
    methods: [method({ _id: "m1" as never, laneId: "l1" as never, name: "公式問題集の3回法" })],
  };
  const { getByRole } = renderWithMantine(<MethodCatalogBoard catalog={catalog} />);

  fireEvent.click(getByRole("button", { name: "公式問題集の3回法を開く" }));
  expect(getByRole("dialog", { name: "公式問題集の3回法の開いたカード" })).toBeDefined();
});
