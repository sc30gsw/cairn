import { ValidationFailedError } from "./errors";
import { addDaysJst, mondayOfWeek } from "./jst";
import { throwDomain } from "./ownerFunctions";

export const PLAN_PRIORITIES = ["high", "medium", "low"] as const satisfies readonly string[];
export type PlanPriority = (typeof PLAN_PRIORITIES)[number];

export const PLAN_VIEWS = ["day", "week", "month", "year"] as const satisfies readonly string[];
export type PlanView = (typeof PLAN_VIEWS)[number];

export const PLAN_PRIORITY_STYLE = {
  high: { googleColorId: "5", googleLabel: "Banana", hex: "#fbd75b", label: "高" },
  low: { googleColorId: "8", googleLabel: "Graphite", hex: "#e1e1e1", label: "低" },
  medium: { googleColorId: "2", googleLabel: "Sage", hex: "#7ae7bf", label: "中" },
} as const satisfies Record<
  PlanPriority,
  { googleColorId: string; googleLabel: string; hex: string; label: string }
>;

export type MinuteOfDay = number & { readonly __brand: "MinuteOfDay" };

const LOCAL_TIME_PATTERN = /^(\d{2}):(\d{2})$/;
export const MINUTES_PER_DAY = 1440;
const SCHEDULE_INSTANT_PATTERN = /^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2}):(\d{2})$/;

export const PLAN_TIME_MESSAGE = "時刻は HH:mm で入力してください";
export const PLAN_WINDOW_MESSAGE = "同じ日の中で、終了は開始より後にしてください";
export const PLAN_TITLE_MESSAGE = "タイトルは必須です";
export const PLAN_FROZEN_MESSAGE = "日付と項目は記録を生やしたあとは変えられません";
export const PLAN_TEMPLATE_NAME_MESSAGE = "名前は必須です";

export function parseMinuteOfDay(value: string, role: "end" | "start"): MinuteOfDay {
  const match = LOCAL_TIME_PATTERN.exec(value);
  if (match === null) {
    throwDomain(new ValidationFailedError({ message: PLAN_TIME_MESSAGE }));
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (minute > 59) {
    throwDomain(new ValidationFailedError({ message: PLAN_TIME_MESSAGE }));
  }
  if (role === "end" && hour === 24 && minute === 0) {
    return MINUTES_PER_DAY as MinuteOfDay;
  }
  if (hour > 23) {
    throwDomain(new ValidationFailedError({ message: PLAN_TIME_MESSAGE }));
  }
  return (hour * 60 + minute) as MinuteOfDay;
}

export function formatMinuteOfDay(minute: number): string {
  if (minute === MINUTES_PER_DAY) {
    return "24:00";
  }
  const hour = Math.floor(minute / 60);
  const min = minute % 60;
  return `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

export function parsePlanWindow(args: { endTime: string; startTime: string }): {
  endMinute: MinuteOfDay;
  startMinute: MinuteOfDay;
} {
  const startMinute = parseMinuteOfDay(args.startTime, "start");
  const endMinute = parseMinuteOfDay(args.endTime, "end");
  if (startMinute >= endMinute) {
    throwDomain(new ValidationFailedError({ message: PLAN_WINDOW_MESSAGE }));
  }
  return { endMinute, startMinute };
}

export function planListDateRange(
  view: PlanView,
  anchorDateJst: string,
): { endExclusive: string; start: string } {
  switch (view) {
    case "day":
      return { endExclusive: addDaysJst(anchorDateJst, 1), start: anchorDateJst };
    case "week": {
      const start = mondayOfWeek(anchorDateJst);
      return { endExclusive: addDaysJst(start, 7), start };
    }
    case "month": {
      const yearMonth = anchorDateJst.slice(0, 7);
      const start = `${yearMonth}-01`;
      const [yearText, monthText] = yearMonth.split("-");
      const year = Number(yearText);
      const month = Number(monthText);
      const endExclusive =
        month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
      return { endExclusive, start };
    }
    case "year": {
      const year = anchorDateJst.slice(0, 4);
      return { endExclusive: `${String(Number(year) + 1)}-01-01`, start: `${year}-01-01` };
    }
  }
}

export function planMinuteToScheduleInstant(dateJst: string, minute: number): string {
  if (minute === MINUTES_PER_DAY) {
    return `${addDaysJst(dateJst, 1)} 00:00:00`;
  }
  return `${dateJst} ${formatMinuteOfDay(minute)}:00`;
}

function minuteOfScheduleInstant(instant: string): { dateJst: string; minute: MinuteOfDay } | null {
  const match = SCHEDULE_INSTANT_PATTERN.exec(instant);
  if (match === null) {
    return null;
  }
  const dateJst = match[1];
  const hour = Number(match[2]);
  const minute = Number(match[3]);
  if (dateJst === undefined || hour > 23 || minute > 59) {
    return null;
  }
  return { dateJst, minute: (hour * 60 + minute) as MinuteOfDay };
}

export function planWindowFromScheduleInstants(
  startAt: string,
  endAt: string,
): { dateJst: string; endMinute: MinuteOfDay; startMinute: MinuteOfDay } | null {
  const start = minuteOfScheduleInstant(startAt);
  const end = minuteOfScheduleInstant(endAt);
  if (start === null || end === null) {
    return null;
  }
  if (end.dateJst === start.dateJst && start.minute < end.minute) {
    return { dateJst: start.dateJst, endMinute: end.minute, startMinute: start.minute };
  }
  if (
    end.dateJst === addDaysJst(start.dateJst, 1) &&
    end.minute === 0 &&
    start.minute < MINUTES_PER_DAY
  ) {
    return {
      dateJst: start.dateJst,
      endMinute: MINUTES_PER_DAY as MinuteOfDay,
      startMinute: start.minute,
    };
  }
  return null;
}

export function planPriorityFromGoogleColorId(colorId: string): PlanPriority {
  if (colorId === "5") {
    return "high";
  }
  if (colorId === "8") {
    return "low";
  }
  return "medium";
}
