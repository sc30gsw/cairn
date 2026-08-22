import { addDaysJst, mondayOfWeek } from "./jst";

export const BOARD_SCHEDULE_VIEWS = ["day", "week", "month", "year"] as const;
export type BoardScheduleView = (typeof BOARD_SCHEDULE_VIEWS)[number];

export function scheduleListRange(
  view: BoardScheduleView,
  anchorDateJst: string,
): { rangeEndExclusive: string; rangeStart: string } {
  switch (view) {
    case "day":
      return {
        rangeEndExclusive: `${addDaysJst(anchorDateJst, 1)} 00:00:00`,
        rangeStart: `${anchorDateJst} 00:00:00`,
      };
    case "week": {
      const weekStart = mondayOfWeek(anchorDateJst);
      return {
        rangeEndExclusive: `${addDaysJst(weekStart, 7)} 00:00:00`,
        rangeStart: `${weekStart} 00:00:00`,
      };
    }
    case "month": {
      const yearMonth = anchorDateJst.slice(0, 7);
      const monthStart = `${yearMonth}-01`;
      const [yearText, monthText] = yearMonth.split("-");
      const year = Number(yearText);
      const month = Number(monthText);
      const nextMonthStart =
        month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
      return {
        rangeEndExclusive: `${nextMonthStart} 00:00:00`,
        rangeStart: `${monthStart} 00:00:00`,
      };
    }
    case "year": {
      const year = anchorDateJst.slice(0, 4);
      const nextYear = String(Number(year) + 1);
      return {
        rangeEndExclusive: `${nextYear}-01-01 00:00:00`,
        rangeStart: `${year}-01-01 00:00:00`,
      };
    }
  }
}
