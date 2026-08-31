import type { LaneMethodOrder, MethodDto, MethodLaneDto } from "./validators";

export type { LaneMethodOrder };

//* レーン(列)自体の並べ替え。orderedLaneIds は所有者の全レーンの置換(全量指定)で、
//* index がそのまま sortOrder になる。services とフロントの楽観更新が同じ計算を使う(SSoT)。
export function applyLaneOrderToList(
  lanes: readonly MethodLaneDto[],
  orderedLaneIds: readonly MethodLaneDto["_id"][],
): MethodLaneDto[] {
  const orderById = new Map(orderedLaneIds.map((laneId, index) => [laneId, index]));
  return lanes.map((lane) => {
    const sortOrder = orderById.get(lane._id);
    return sortOrder === undefined ? lane : { ...lane, sortOrder };
  });
}

//* 全量指定の検証: 既存レーンと過不足なく1:1で対応しないなら不正(黙って消えるレーンを作らない)。
export function validateLaneOrder(
  lanes: readonly { _id: MethodLaneDto["_id"] }[],
  orderedLaneIds: readonly MethodLaneDto["_id"][],
): string | null {
  const requested = new Set(orderedLaneIds);
  if (requested.size !== orderedLaneIds.length) {
    return "レーンの並べ替えが不正です";
  }
  if (lanes.length !== orderedLaneIds.length) {
    return "レーンの並べ替えが不正です";
  }
  if (lanes.some((lane) => !requested.has(lane._id))) {
    return "レーンの並べ替えが不正です";
  }
  return null;
}

//* 方法のドラッグ並べ替え(レーン内・レーン間)の検証。itemOrder.ts と同じ「全量指定」規則:
//* 更新対象レーンの既存の方法は、同じレーンの並びに残るか、同じバッチで別レーンへ動くかの
//* どちらかでなければならない(黙って消える方法を作らない)。
export function validateLaneOrderUpdates(
  methods: readonly { _id: MethodDto["_id"]; laneId: MethodDto["laneId"] }[],
  updates: readonly LaneMethodOrder[],
): string | null {
  const methodById = new Map(methods.map((method) => [method._id, method]));

  for (const update of updates) {
    const requested = new Set(update.orderedMethodIds);
    const currentInLane = methods.filter((method) => method.laneId === update.laneId);

    for (const method of currentInLane) {
      if (requested.has(method._id)) {
        continue;
      }
      const movedElsewhere = updates.some(
        (other) => other.laneId !== update.laneId && other.orderedMethodIds.includes(method._id),
      );
      if (!movedElsewhere) {
        return "方法の並べ替えが不正です";
      }
    }

    for (const methodId of update.orderedMethodIds) {
      if (!methodById.has(methodId)) {
        return "方法の並べ替えが不正です";
      }
    }
  }

  return null;
}

//* 並べ替えを適用した新しい配列を返す純関数。services 側の書き込みと、フロントの楽観更新の両方が
//* 同じ計算を使う(SSoT — itemOrder.ts の applyItemOrderToList と同じ役割)。
export function applyMethodOrderToList(
  methods: readonly MethodDto[],
  updates: readonly LaneMethodOrder[],
): MethodDto[] {
  if (updates.length === 0) {
    return [...methods];
  }

  const methodById = new Map(methods.map((method) => [method._id, method]));
  const nextById = new Map<MethodDto["_id"], MethodDto>();

  for (const update of updates) {
    for (const [sortOrder, methodId] of update.orderedMethodIds.entries()) {
      const existing = methodById.get(methodId);
      if (existing === undefined) {
        continue;
      }
      nextById.set(methodId, {
        ...existing,
        laneId: update.laneId,
        sortOrder,
      });
    }
  }

  return methods.map((method) => nextById.get(method._id) ?? method);
}
