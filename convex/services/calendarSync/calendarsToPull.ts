export function calendarsToPull(plan: {
  calendarId: string;
  visibleCalendarIds: readonly string[];
}): string[] {
  return [...new Set([...plan.visibleCalendarIds, plan.calendarId])];
}
