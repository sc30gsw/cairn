export type CompletionCounts = {
  confirmed: number;
  leftover: number;
  ongoing: number;
  skipped: number;
};

export function completedCount(counts: CompletionCounts): number {
  return counts.confirmed + counts.leftover + counts.ongoing + counts.skipped;
}

export function confirmedRatio(counts: CompletionCounts): number {
  const total = completedCount(counts);
  return total === 0 ? 0 : counts.confirmed / total;
}
