import type { LaneMethodOrder, MethodDto, MethodLaneDto } from "./validators";

export type { LaneMethodOrder };

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
