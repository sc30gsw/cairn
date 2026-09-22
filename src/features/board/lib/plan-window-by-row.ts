type PlanWindowSource = {
  endTime: string;
  materializedRowId?: string;
  startTime: string;
};

type BoardIdentity = {
  _id: string;
  itemId: string;
};

export type BoardCardPlace = {
  countLabel: string;
  ordinalLabel: string;
};

export type BoardCardMark = {
  place: BoardCardPlace | null;
  timeLabel: string | null;
};

export function planWindowLabelByRowId(events: readonly PlanWindowSource[]): Map<string, string> {
  const labels = new Map<string, string>();
  for (const event of events) {
    if (event.materializedRowId === undefined || labels.has(event.materializedRowId)) {
      continue;
    }
    labels.set(event.materializedRowId, `${event.startTime}〜${event.endTime}`);
  }
  return labels;
}

export function boardCardMark(
  row: BoardIdentity,
  rows: readonly BoardIdentity[],
  windowsByRowId: ReadonlyMap<string, string>,
): BoardCardMark {
  const timeLabel = windowsByRowId.get(row._id) ?? null;
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
    return { place: null, timeLabel };
  }
  return {
    place: {
      countLabel: `${String(count)}件`,
      ordinalLabel: `${String(index + 1)}件目`,
    },
    timeLabel,
  };
}
