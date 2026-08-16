import type { RowDto } from "./validators";

export type VolumeRow = Pick<RowDto, "minutes" | "status">;

export function confirmedVolumeMinutes(rows: readonly VolumeRow[]): number {
  let total = 0;
  for (const row of rows) {
    if (row.status === "確定") {
      total += row.minutes;
    }
  }
  return total;
}
