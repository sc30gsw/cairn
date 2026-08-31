import { expect, test } from "vite-plus/test";

import { applyMethodOrderToList, validateLaneOrderUpdates } from "./methodOrder";
import type { MethodDto } from "./validators";

function method(id: string, laneId: string, sortOrder: number): MethodDto {
  return {
    _id: id as MethodDto["_id"],
    bodyText: "",
    completionHtml: "",
    laneId: laneId as MethodDto["laneId"],
    memoHtml: "",
    name: `方法${id}`,
    nowViewing: false,
    sortOrder,
  };
}

const laneA = "laneA" as MethodDto["laneId"];
const laneB = "laneB" as MethodDto["laneId"];

test("レーン内の並べ替えは orderedMethodIds の順で sortOrder を振り直す", () => {
  const methods = [method("m1", "laneA", 0), method("m2", "laneA", 1)];
  const next = applyMethodOrderToList(methods, [
    { laneId: laneA, orderedMethodIds: [methods[1]!._id, methods[0]!._id] },
  ]);
  expect(next.map(({ _id, sortOrder }) => ({ _id, sortOrder }))).toEqual([
    { _id: methods[0]!._id, sortOrder: 1 },
    { _id: methods[1]!._id, sortOrder: 0 },
  ]);
});

test("レーン間の移動は laneId を差し替え、移動先の index が sortOrder になる", () => {
  const methods = [method("m1", "laneA", 0), method("m2", "laneB", 0)];
  const next = applyMethodOrderToList(methods, [
    { laneId: laneA, orderedMethodIds: [] },
    { laneId: laneB, orderedMethodIds: [methods[1]!._id, methods[0]!._id] },
  ]);
  const moved = next.find((entry) => entry._id === methods[0]!._id);
  expect(moved?.laneId).toBe(laneB);
  expect(moved?.sortOrder).toBe(1);
});

test("更新なしなら同じ並びのコピーを返す", () => {
  const methods = [method("m1", "laneA", 0)];
  const next = applyMethodOrderToList(methods, []);
  expect(next).toEqual(methods);
  expect(next).not.toBe(methods);
});

test("既存の方法が並びから黙って消える指定は不正", () => {
  const methods = [method("m1", "laneA", 0), method("m2", "laneA", 1)];
  expect(
    validateLaneOrderUpdates(methods, [{ laneId: laneA, orderedMethodIds: [methods[0]!._id] }]),
  ).toBe("方法の並べ替えが不正です");
});

test("同じバッチで別レーンへ動く方法は消えた扱いにしない", () => {
  const methods = [method("m1", "laneA", 0), method("m2", "laneA", 1)];
  expect(
    validateLaneOrderUpdates(methods, [
      { laneId: laneA, orderedMethodIds: [methods[0]!._id] },
      { laneId: laneB, orderedMethodIds: [methods[1]!._id] },
    ]),
  ).toBeNull();
});

test("存在しない方法 id を含む指定は不正", () => {
  const methods = [method("m1", "laneA", 0)];
  expect(
    validateLaneOrderUpdates(methods, [
      { laneId: laneA, orderedMethodIds: [methods[0]!._id, "ghost" as MethodDto["_id"]] },
    ]),
  ).toBe("方法の並べ替えが不正です");
});
