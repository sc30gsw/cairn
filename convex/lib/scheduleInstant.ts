import { ValidationFailedError } from "./errors";
import { throwDomain } from "./ownerFunctions";

export const SCHEDULE_INSTANT_PATTERN = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

export function isScheduleInstant(value: string): boolean {
  return SCHEDULE_INSTANT_PATTERN.test(value);
}

export function requireScheduleInstant(value: string): string {
  if (!SCHEDULE_INSTANT_PATTERN.test(value)) {
    throwDomain(new ValidationFailedError({ message: "日時の形式が不正です" }));
  }
  return value;
}

export function assertScheduleRange(startAt: string, endAt: string): void {
  if (endAt <= startAt) {
    throwDomain(new ValidationFailedError({ message: "終了は開始より後にしてください" }));
  }
}
