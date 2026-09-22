type PlanWindowSource = {
  endTime: string;
  materializedRowId?: string;
  startTime: string;
};

type BoardIdentity = {
  _id: string;
  itemId: string;
};

export type BoardCardMark = {
  ordinalLabel: string | null;
  timeLabels: readonly string[];
};

export function planWindowLabelByRowId(
  events: readonly PlanWindowSource[],
): Map<string, readonly string[]> {
  const labels = new Map<string, string[]>();
  for (const event of events) {
    if (event.materializedRowId === undefined) {
      continue;
    }
    const label = `${event.startTime}〜${event.endTime}`;
    const current = labels.get(event.materializedRowId);
    if (current === undefined) {
      labels.set(event.materializedRowId, [label]);
      continue;
    }
    if (!current.includes(label)) {
      current.push(label);
    }
  }
  return labels;
}

export function boardCardMark(
  row: BoardIdentity,
  rows: readonly BoardIdentity[],
  windowsByRowId: ReadonlyMap<string, readonly string[]>,
): BoardCardMark {
  const timeLabels = windowsByRowId.get(row._id) ?? [];
  let count = 0;
  let index = 0;
  for (const candidate of rows) {
    if (candidate.itemId !== row.itemId) {
      continue;
    }
    if (candidate._id === row._id) {
      index = count;
    }
    count += 1;
  }
  if (count < 2) {
    return { ordinalLabel: null, timeLabels };
  }
  return {
    ordinalLabel: `${String(index + 1)}件目`,
    timeLabels,
  };
}
