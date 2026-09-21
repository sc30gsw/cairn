import type { DateJst } from "~domain/jst";

export function formatPlanDateTooltip(dateJst: DateJst): string {
  const [year, month, day] = dateJst.split("-");
  return `${year}/${month}/${day}`;
}
