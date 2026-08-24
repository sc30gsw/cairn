//* 消化率の計算プリミティブ。テーブル型に依存しないので週次/月次レビューと presetDigest で共有する。

export type CompletionCounts = {
  confirmed: number;
  leftover: number;
  ongoing: number;
  skipped: number;
};

export function completedCount(counts: CompletionCounts): number {
  return counts.confirmed + counts.leftover + counts.ongoing + counts.skipped;
}

//* 消化率(CONTEXT「消化」): 確定 / 並んだ件数。並んだ件数が0なら0(ゼロ除算を避ける)。
export function confirmedRatio(counts: CompletionCounts): number {
  const total = completedCount(counts);
  return total === 0 ? 0 : counts.confirmed / total;
}
