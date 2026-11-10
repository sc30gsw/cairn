import { expect, test } from "vite-plus/test";

import type { Doc, Id } from "../../_generated/dataModel";
import { dueUnplacedFlags } from "./placeDueReviews";

const TODAY = "2026-08-17";
const ITEM = "item" as Id<"items">;
const SOURCE = "source" as Id<"rows">;

type Shape = {
  creation: number;
  dueJst: string;
  placed: boolean;
};

const SHAPES = [
  { creation: 1, dueJst: "2026-08-15", placed: false },
  { creation: 2, dueJst: "2026-08-15", placed: false },
  { creation: 3, dueJst: TODAY, placed: false },
  { creation: 4, dueJst: "2026-08-18", placed: false },
  { creation: 5, dueJst: "2026-08-15", placed: true },
  { creation: 6, dueJst: TODAY, placed: true },
] as const satisfies readonly Shape[];

function subsets(size: number): Shape[][] {
  const found: Shape[][] = [];
  const walk = (start: number, acc: Shape[]): void => {
    if (acc.length === size) {
      found.push([...acc]);
      return;
    }
    for (let index = start; index < SHAPES.length; index += 1) {
      const shape = SHAPES[index];
      if (shape === undefined) {
        continue;
      }
      acc.push(shape);
      walk(index + 1, acc);
      acc.pop();
    }
  };
  walk(0, []);
  return found;
}

function flag(index: number, shape: Shape): Doc<"reviewFlags"> {
  const reviewRowId = shape.placed ? (`placed-${String(index)}` as Id<"rows">) : undefined;
  return {
    _creationTime: shape.creation,
    _id: `flag-${String(index)}` as Id<"reviewFlags">,
    content: "Unit",
    dueJst: shape.dueJst,
    itemId: ITEM,
    ownerId: "owner",
    ...(reviewRowId === undefined ? {} : { reviewRowId }),
    sourceRowId: SOURCE,
    stage: 0,
  };
}

function expectedOrder(flags: readonly Doc<"reviewFlags">[]): Id<"reviewFlags">[] {
  return flags
    .filter((entry) => entry.reviewRowId === undefined && entry.dueJst <= TODAY)
    .toSorted((left, right) => {
      if (left.dueJst < right.dueJst) {
        return -1;
      }
      if (left.dueJst > right.dueJst) {
        return 1;
      }
      return left._creationTime - right._creationTime;
    })
    .map((entry) => entry._id);
}

test("期日の来た未配置の復習だけを、期日の古い順・同じ期日は作成順に並べる", () => {
  const cases = [0, 1, 2, 3].flatMap((size) => subsets(size));
  expect(cases).toHaveLength(42);
  for (const [caseIndex, shapes] of cases.entries()) {
    const flags = shapes.map((shape, index) => flag(caseIndex * 10 + index, shape));
    expect(dueUnplacedFlags(flags, TODAY).map((entry) => entry._id)).toEqual(expectedOrder(flags));
  }
});
