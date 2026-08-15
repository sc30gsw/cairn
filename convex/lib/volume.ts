export type VolumeRow = {
  minutes: number;
  status: "スキップ" | "未着手" | "確定";
};

export function confirmedVolumeMinutes(rows: readonly VolumeRow[]): number {
  let total = 0;
  for (const row of rows) {
    if (row.status === "確定") {
      total += row.minutes;
    }
  }
  return total;
}
