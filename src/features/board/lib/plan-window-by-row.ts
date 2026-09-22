type PlanWindowSource = {
  endTime: string;
  materializedRowId?: string;
  startTime: string;
};

type BoardIdentity = {
  _id: string;
  itemId: string;
};

export function planWindowLabelByRowId(events: readonly PlanWindowSource[]): Map<string, string> {
  const labels = new Map<string, string>();
  for (const event of events) {
    if (event.materializedRowId === undefined || labels.has(event.materializedRowId)) {
      continue;
    }
    labels.set(event.materializedRowId, `予定 ${event.startTime}–${event.endTime}`);
  }
  return labels;
}

export function boardRowDistinction(
  row: BoardIdentity,
  rows: readonly BoardIdentity[],
  windowsByRowId: ReadonlyMap<string, string>,
): string | null {
  const windowLabel = windowsByRowId.get(row._id);
  if (windowLabel !== undefined) {
    return windowLabel;
  }
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
    return null;
  }
  return `${String(index + 1)}件目`;
}
